import ast
import json
import time
from asyncio import Event as AsyncEvent
from contextlib import redirect_stdout
from multiprocessing import Queue
from queue import Empty
from threading import Event, Thread
from typing import Any, Dict, Iterable, Optional

from mage_ai.errors.models import ErrorDetails
from mage_ai.kernels.magic.constants import ExecutionStatus, ResultType
from mage_ai.kernels.magic.models import ExecutionResult, ProcessContext, ProcessDetails
from mage_ai.kernels.magic.stdout import AsyncStdout
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.environments import is_debug as is_debug_base
from mage_ai.shared.queues import Queue as FasterQueue

FLUSH_INTERVAL = 0.1


def is_debug():
    return True and is_debug_base()


def set_node_line_numbers(node: ast.AST, lineno: int, col_offset: int):
    for n in ast.walk(node):
        if isinstance(n, ast.AST):
            n.lineno = lineno
            n.col_offset = col_offset


def modify_and_execute(code_block: str, globals: Dict[str, Any], local_variables: Dict[str, Any]):
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
                ast.Name(id='__output__', ctx=ast.Store(), lineno=lineno, col_offset=col_offset)
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
                value=ast.Name(id=target.id, ctx=ast.Load(), lineno=lineno, col_offset=col_offset),
                lineno=lineno,
                col_offset=col_offset,
            )
            parsed_code.body.append(assignment)
    else:
        pass

    modified_code = ast.Module(body=parsed_code.body, type_ignores=[])

    try:
        exec(compile(modified_code, '<string>', 'exec'), globals)
    except Exception as err:
        print(f'Error during code execution: {err}')

    local_variables.update({key: value for key, value in globals.items() if key != '__builtins__'})


def check_queue(queue: Queue):
    items = []
    try:
        while True:
            items.append(queue.get_nowait())
    except Empty:
        pass
    for item in items:
        queue.put(item)


def read_stdout_continuously(
    uuid: str,
    queue: Queue,
    process: ProcessDetails,
    async_stdout: AsyncStdout,
    stop_event: Event,
    main_queue: Optional[FasterQueue] = None,
    output_file: Optional[str] = None,
) -> None:
    file = None
    if output_file:
        file = open(output_file, 'a')

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

            if file:
                file.write(json.dumps(result.to_dict()) + '\n')
                file.flush()

        time.sleep(FLUSH_INTERVAL / 2)

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

        if file:
            file.write(json.dumps(result.to_dict()) + '\n')
            file.flush()

    if main_queue is not None:
        main_queue.put(uuid)

    if file:
        file.close()


async def execute_code_async(
    uuid: str,
    queue: Queue,
    stop_events: Iterable[AsyncEvent],
    message: str,
    process_details: Dict[str, Any],
    context: Optional[ProcessContext] = None,
    main_queue: Optional[FasterQueue] = None,
    output_file: Optional[str] = None,
) -> None:
    process = ProcessDetails.load(**process_details)

    exec_globals = {}
    local_variables = {}
    stop_event_read = Event()

    if is_debug():
        print(f'Executing full code block: {message}')

    try:
        async_stdout = AsyncStdout()  # Initialize the custom stdout

        reader_thread = Thread(
            target=read_stdout_continuously,
            args=(
                uuid,
                queue,
                process,
                async_stdout,
                stop_event_read,
                main_queue,
                output_file,
            ),
            daemon=True,
        )
        reader_thread.start()

        with redirect_stdout(async_stdout):
            modify_and_execute(message, exec_globals, local_variables)
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
        reader_thread.join(timeout=FLUSH_INTERVAL * 2)

        while check_queue(queue):
            time.sleep(FLUSH_INTERVAL)

        final_output = local_variables.get('__output__')
        if final_output is not None:
            result = ExecutionResult.load(
                output=final_output,
                process=process,
                status=ExecutionStatus.SUCCESS,
                type=ResultType.DATA,
                uuid=uuid,
            )
            queue.put(result)

            if output_file and result.output is not None:
                with open(output_file, 'a') as file:
                    file.write(json.dumps(result.to_dict()) + '\n')
                    file.flush()

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
                error=ErrorDetails.from_current_error(err),
                process=process,
                status=ExecutionStatus.CANCELLED,
                type=ResultType.STATUS,
                uuid=uuid,
            ),
        )
    except Exception as err:
        queue.put(
            ExecutionResult.load(
                error=ErrorDetails.from_current_error(err),
                process=process,
                status=ExecutionStatus.ERROR,
                type=ResultType.STATUS,
                uuid=uuid,
            ),
        )
    finally:
        if main_queue is not None:
            main_queue.put(uuid)
        queue.put(None)  # Put a sentinel value to signal the end of output
