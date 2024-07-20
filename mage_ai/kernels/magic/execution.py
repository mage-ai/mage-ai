import ast
import asyncio
import inspect
import json
import os
from asyncio import Event as AsyncEvent
from contextlib import contextmanager, redirect_stdout
from multiprocessing import Queue
from queue import Empty
from threading import Event
from typing import Any, Callable, Dict, Iterable, Optional

from mage_ai.errors.models import ErrorDetails
from mage_ai.errors.utils import USER_CODE_MARKER
from mage_ai.kernels.magic.constants import ExecutionStatus, ResultType
from mage_ai.kernels.magic.environments.models import OutputManager
from mage_ai.kernels.magic.models import ExecutionResult, ProcessContext, ProcessDetails
from mage_ai.kernels.magic.stdout import AsyncStdout
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.queues import Queue as FasterQueue

FLUSH_INTERVAL = 0.1


def is_debug():
    return False


def __filter_traceback(stacktrace, code_filename='<string>'):
    filtered_stacktrace = []
    for line in stacktrace:
        if code_filename in line:
            filtered_stacktrace.append(line)
    return filtered_stacktrace


def set_node_line_numbers(node: ast.AST, lineno: int, col_offset: int):
    for n in ast.walk(node):
        if isinstance(n, ast.AST):
            if hasattr(n, 'lineno'):
                n.lineno = lineno
            if hasattr(n, 'col_offset'):
                n.col_offset = col_offset


async def __modify_and_execute(
    code_block: str,
    local_variables,
    execute: Optional[Callable] = None,
    execution_variables: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    execution_variables = execution_variables or {}

    modified_code = None
    if code_block:
        # Parse the provided code block
        parsed_code = ast.parse(code_block)
        if not parsed_code.body:
            raise ValueError('Empty code block provided')

        last_statement = parsed_code.body[-1]

        lineno = last_statement.lineno
        col_offset = last_statement.col_offset

        if isinstance(last_statement, ast.Expr):
            assignment = ast.Assign(
                targets=[
                    ast.Name(
                        id='__output__', ctx=ast.Store(), lineno=lineno, col_offset=col_offset
                    )
                ],
                value=last_statement.value,
                lineno=lineno,
                col_offset=col_offset,
            )
            parsed_code.body[-1] = assignment
        elif isinstance(last_statement, ast.Assign):
            target = last_statement.targets[0]
            if isinstance(target, ast.Name):
                assignment = ast.Assign(
                    targets=[
                        ast.Name(
                            id='__output__', ctx=ast.Store(), lineno=lineno, col_offset=col_offset
                        )
                    ],
                    value=ast.Name(
                        id=target.id, ctx=ast.Load(), lineno=lineno, col_offset=col_offset
                    ),
                    lineno=lineno,
                    col_offset=col_offset,
                )
                parsed_code.body.append(assignment)
        else:
            pass

        modified_code = ast.Module(body=parsed_code.body, type_ignores=[])

    error = None
    try:
        # This takes precedence.
        if execute:
            res = execute(**execution_variables)
            if res and inspect.isawaitable(res):
                res = await res
        elif modified_code:
            modified_code = f'{USER_CODE_MARKER}\n{modified_code}'
            exec(compile(modified_code, '<string>', 'exec'), execution_variables)
    except Exception as err:
        error = err

    local_variables.update({
        key: value for key, value in (execution_variables or {}).items() if key != '__builtins__'
    })

    if error:
        raise error

    return local_variables


def check_queue(queue: Queue):
    items = []
    try:
        while True:
            items.append(queue.get_nowait())
    except Empty:
        pass
    for item in items:
        queue.put(item)


async def __read_stdout_continuously(
    uuid: str,
    queue: Queue,
    process: ProcessDetails,
    async_stdout: AsyncStdout,
    stop_event: Event,
    main_queue: Optional[FasterQueue] = None,
    output_manager_config: Optional[Dict[str, str]] = None,
) -> None:
    output_manager = OutputManager.load(**output_manager_config) if output_manager_config else None

    while not stop_event.is_set():
        output = async_stdout.get_output()
        if output:
            if is_debug():
                print(f'[SRT] Debug: Captured output: {output}')
            result = ExecutionResult.load(
                data_type=DataType.TEXT_PLAIN,
                output=output,
                process=process,
                status=ExecutionStatus.RUNNING,
                type=ResultType.STDOUT,
                uuid=uuid,
            )
            queue.put(result)

            if main_queue is not None:
                main_queue.put(uuid)

            if output_manager:
                await output_manager.append_message(json.dumps(result.to_dict()) + '\n')

        await asyncio.sleep(FLUSH_INTERVAL / 2)

    output = async_stdout.get_output()
    if output:
        if is_debug():
            print(f'[END] Debug: Captured output: {output}')

        result = ExecutionResult.load(
            data_type=DataType.TEXT_PLAIN,
            output=output,
            process=process,
            status=ExecutionStatus.RUNNING,
            type=ResultType.STDOUT,
            uuid=uuid,
        )
        queue.put(result)

        if output_manager:
            await output_manager.append_message(json.dumps(result.to_dict()) + '\n')

    if main_queue is not None:
        main_queue.put(uuid)


@contextmanager
def __temporary_env(env: Dict[str, str]):
    old_env = os.environ.copy()
    os.environ.update(env)
    try:
        yield
    finally:
        os.environ.clear()
        os.environ.update(old_env)


async def execute_code_async(
    uuid: str,
    queue: Queue,
    stop_events: Iterable[AsyncEvent],
    message: str,
    process_details: Dict[str, Any],
    context: Optional[ProcessContext] = None,
    main_queue: Optional[FasterQueue] = None,
    **kwargs,
) -> None:
    process = ProcessDetails.load(**process_details)

    local_variables = {}
    stop_event_read = Event()
    output_manager_config = kwargs.get('output_manager')
    output_manager = None
    if output_manager_config and isinstance(output_manager_config, dict):
        output_manager = OutputManager.load(**output_manager_config)

    if is_debug():
        print(f'Executing full code block: {message}')

    try:
        async_stdout = AsyncStdout()  # Initialize the custom stdout

        # Start the coroutine to read stdout continuously
        reader_task = asyncio.create_task(
            __read_stdout_continuously(
                uuid,
                queue,
                process,
                async_stdout,
                stop_event_read,
                main_queue,
                output_manager_config,
            )
        )

        queue.put(
            ExecutionResult.load(
                process=process,
                status=ExecutionStatus.INIT,
                type=ResultType.STATUS,
                uuid=uuid,
            )
        )

        queue.put(
            ExecutionResult.load(
                process=process,
                status=ExecutionStatus.RUNNING,
                type=ResultType.STATUS,
                uuid=uuid,
            )
        )

        with redirect_stdout(async_stdout):
            try:
                environment_variables = kwargs.get('environment_variables') or {}
                with __temporary_env(environment_variables):
                    execution_variables = kwargs.get('execution_variables') or {}
                    execute = kwargs.get('execute')

                    local_variables = await __modify_and_execute(
                        message,
                        local_variables,
                        execute=execute,
                        execution_variables=execution_variables,
                    )
            except Exception as err:
                result = ExecutionResult.load(
                    error=ErrorDetails.from_current_error(err, message),
                    process=process,
                    status=ExecutionStatus.ERROR,
                    type=ResultType.STATUS,
                    uuid=uuid,
                )

                if output_manager:
                    await output_manager.append_message(json.dumps(result.to_dict()) + '\n')

                queue.put(result)

            if any(stop_event.is_set() for stop_event in stop_events):
                raise StopAsyncIteration

            queue.put(
                ExecutionResult.load(
                    process=process,
                    status=ExecutionStatus.RUNNING,
                    type=ResultType.STATUS,
                    uuid=uuid,
                )
            )

        stop_event_read.set()
        await reader_task

        while check_queue(queue):
            await asyncio.sleep(FLUSH_INTERVAL)

        success_result_options = kwargs.get('success_result_options') or None
        final_output = local_variables.get('__output__')

        if final_output is not None or success_result_options is not None:
            result_options = dict(
                output=final_output,
                process=process,
                status=ExecutionStatus.SUCCESS,
                type=ResultType.DATA,
                uuid=uuid,
            )

            if success_result_options is not None:
                result_options.update(success_result_options)

            result = ExecutionResult.load(**result_options)
            queue.put(result)

            if output_manager and result.output is not None:
                await output_manager.append_message(json.dumps(result.to_dict()) + '\n')

        if output_manager:
            store_locals = kwargs.get('store_locals', False)
            if local_variables and store_locals:
                await output_manager.store_local_variables(local_variables)

            store_output = kwargs.get('store_output', False)
            if final_output and store_output:
                await output_manager.store_output(final_output)

        if output_manager:
            await output_manager.delete(if_empty=True)

        queue.put(
            ExecutionResult.load(
                process=process,
                status=ExecutionStatus.READY,
                type=ResultType.STATUS,
                uuid=uuid,
            )
        )
    except StopAsyncIteration as err:
        queue.put(
            ExecutionResult.load(
                error=ErrorDetails.from_current_error(err, message),
                process=process,
                status=ExecutionStatus.CANCELLED,
                type=ResultType.STATUS,
                uuid=uuid,
            ),
        )
    except Exception as err:
        result = ExecutionResult.load(
            error=ErrorDetails.from_current_error(err, message),
            process=process,
            status=ExecutionStatus.ERROR,
            type=ResultType.STATUS,
            uuid=uuid,
        )

        if output_manager and result.output is not None:
            await output_manager.append_message(json.dumps(result.to_dict()) + '\n')

        queue.put(result)
    finally:
        if main_queue is not None:
            main_queue.put(uuid)
        queue.put(None)  # Put a sentinel value to signal the end of output
