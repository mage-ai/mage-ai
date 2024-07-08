import time
from asyncio import Event as AsyncEvent
from contextlib import redirect_stdout
from multiprocessing import Queue
from queue import Empty
from threading import Event, Thread
from typing import Dict, Iterable, Optional

from mage_ai.errors.models import ErrorDetails
from mage_ai.kernels.magic.constants import ExecutionStatus, ResultType
from mage_ai.kernels.magic.models import ExecutionResult, ProcessContext, ProcessDetails
from mage_ai.kernels.magic.stdout import AsyncStdout
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.environments import is_debug as is_debug_base
from mage_ai.shared.queues import Queue as FasterQueue

FLUSH_INTERVAL = 0.5


def is_debug():
    return True and is_debug_base()


def check_queue(queue):
    items = []
    try:
        while True:
            items.append(queue.get_nowait())
    except Empty:
        pass
    # Put back the items
    for item in items:
        queue.put(item)
    if is_debug():
        print(f"[DEBUG QUEUE] Current queue items: {items}")


def read_stdout_continuously(
    uuid: str,
    queue: Queue,
    process: ProcessDetails,
    async_stdout: AsyncStdout,
    stop_event: Event,
    main_queue: Optional[FasterQueue] = None,
) -> None:
    while not stop_event.is_set():
        output = async_stdout.get_output()
        if output:
            if is_debug():
                print(f"[SRT] Debug: Captured output: {output}")
            # Just enqueue it or else it’ll resolve to None
            queue.put(
                ExecutionResult.load(
                    data_type=DataType.TEXT_PLAIN,
                    output=output,
                    process=process,
                    status=ExecutionStatus.RUNNING,
                    type=ResultType.STDOUT,
                    uuid=uuid,
                )
            )
            if main_queue is not None:
                main_queue.put(uuid)
        time.sleep(FLUSH_INTERVAL / 10)

    output = async_stdout.get_output()
    if output:
        if is_debug():
            print(f"[END] Debug: Captured output: {output}")
        queue.put(
            ExecutionResult.load(
                data_type=DataType.TEXT_PLAIN,
                output=output,
                process=process,
                status=ExecutionStatus.RUNNING,
                type=ResultType.STDOUT,
                uuid=uuid,
            )
        )
    if main_queue is not None:
        main_queue.put(uuid)


async def execute_code_async(
    uuid: str,
    queue: Queue,
    stop_events: Iterable[AsyncEvent],
    message: str,
    process_details: Dict,
    context: Optional[ProcessContext] = None,
    main_queue: Optional[FasterQueue] = None,
) -> None:
    process = ProcessDetails.load(**process_details)

    exec_globals = {}
    code_lines = message.split('\n')
    last_output = None
    stop_event_read = Event()

    if is_debug():
        print(f'Code lines: {code_lines}')

    try:
        if is_debug():
            print('Executing full code block.')

        compiled_code = compile(message, '<string>', 'exec')
        async_stdout = AsyncStdout()  # Initialize the custom stdout

        # Start a background thread to read from async_stdout
        reader_thread = Thread(
            target=read_stdout_continuously,
            args=(
                uuid,
                queue,
                process,
                async_stdout,
                stop_event_read,
                main_queue,
            ),
            daemon=True,
        )
        reader_thread.start()

        # Use the custom stdout in place of sys.stdout
        with redirect_stdout(async_stdout):
            exec(compiled_code, exec_globals)
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

        stop_event_read.set()  # Signal the reader thread to stop
        reader_thread.join(timeout=FLUSH_INTERVAL * 2)  # Make sure reader thread finishes

        last_expr = code_lines[-1].strip()  # Get the last expression for evaluation
        if is_debug():
            print(f'Last expression: {last_expr}')

        # Evaluate only the last expression if it's not a comment
        if last_expr and not last_expr.startswith('#'):
            compiled_expr = compile(last_expr, '<string>', 'eval')
            output = eval(compiled_expr, exec_globals)
            if output is not None:  # Only print if there is output
                # print(output)
                last_output = output  # Keep track of the last output

        while check_queue(queue):
            time.sleep(FLUSH_INTERVAL)
        queue.put(
            ExecutionResult.load(
                output=last_output if 'last_output' in locals() else None,
                process=process,
                status=ExecutionStatus.SUCCESS,
                type=ResultType.DATA,
                uuid=uuid,
            )
        )
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
