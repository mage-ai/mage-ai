import threading
import time
from contextlib import redirect_stdout
from multiprocessing.queues import Queue
from typing import Dict

from mage_ai.errors.models import ErrorDetails
from mage_ai.kernels.magic.constants import ExecutionStatus, ResultType
from mage_ai.kernels.magic.models import ExecutionResult, ProcessDetails
from mage_ai.kernels.magic.stdout import AsyncStdout
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.environments import is_debug


def read_stdout_continuously(async_stdout, queue, process, stop_event):
    while (
        not stop_event.is_set() or async_stdout.get_output()
    ):  # Continue until stop signal and buffer is empty
        output = async_stdout.get_output()
        if output:
            for line in output.splitlines():
                line = line.strip()
                if line:
                    queue.put(
                        ExecutionResult.load(
                            data_type=DataType.TEXT_PLAIN,
                            output=line,
                            process=process,
                            status=ExecutionStatus.RUNNING,
                            type=ResultType.STDOUT,
                        ),
                    )
        time.sleep(0)  # Sleep a bit to avoid busy waiting


async def execute_code_async(message: str, queue: Queue, uuid: str, process_dict: Dict) -> None:
    process = ProcessDetails.load(**process_dict)

    exec_globals = {}
    code_lines = message.split('\n')
    last_output = None
    stop_event = threading.Event()

    if is_debug() or True:
        print(f'Code lines: {code_lines}')

    try:
        if is_debug() or True:
            print('Executing full code block.')

        compiled_code = compile(message, '<string>', 'exec')
        async_stdout = AsyncStdout()  # Initialize the custom stdout

        # Start a background thread to read from async_stdout
        reader_thread = threading.Thread(
            target=read_stdout_continuously,
            args=(async_stdout, queue, process, stop_event),
            daemon=True,
        )
        reader_thread.start()

        # Use the custom stdout in place of sys.stdout
        with redirect_stdout(async_stdout):
            exec(compiled_code, exec_globals)

        stop_event.set()  # Signal the reader thread to stop
        reader_thread.join(timeout=1)  # Make sure reader thread finishes

        last_expr = code_lines[-1].strip()  # Get the last expression for evaluation
        if is_debug() or True:
            print(f'Last expression: {last_expr}')

        # Evaluate only the last expression if it's not a comment
        if last_expr and not last_expr.startswith('#'):
            compiled_expr = compile(last_expr, '<string>', 'eval')
            output = eval(compiled_expr, exec_globals)
            if output is not None:  # Only print if there is output
                print(output)
                last_output = output  # Keep track of the last output

        queue.put(
            ExecutionResult.load(
                output=last_output if 'last_output' in locals() else None,
                process=process,
                status=ExecutionStatus.SUCCESS,
                type=ResultType.DATA,
            ),
        )

        # Put a sentinel value to signal the end of output
        queue.put(None)
    except Exception as err:
        queue.put(
            ExecutionResult.load(
                error=ErrorDetails.from_current_error(err),
                process=process,
                status=ExecutionStatus.ERROR,
            ),
        )
