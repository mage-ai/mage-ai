import asyncio
from multiprocessing.queues import Queue
from typing import Dict

from mage_ai.errors.models import ErrorDetails
from mage_ai.kernels.magic.constants import ExecutionStatus
from mage_ai.kernels.magic.models import ExecutionResult
from mage_ai.shared.environments import is_debug


async def execute_code_async(message: str, queue: Queue, uuid: str, process_dict: Dict) -> None:
    exec_globals = {}
    code_lines = message.split('\n')
    if is_debug():
        print(f'Code lines: {code_lines}')

    for index, line in enumerate(code_lines):
        try:
            if is_debug():
                print(f'Executing line: {line}')
            code = compile(line, '<string>', 'exec')
            exec(code, exec_globals)

            if line.strip():  # Avoid empty lines
                last_expr = code_lines[index].strip()
                if is_debug():
                    print(f'Last expression: {last_expr}')
                if not last_expr.startswith('#'):  # Avoid comments
                    compiled_expr = compile(last_expr, '<string>', 'eval')
                    result = eval(compiled_expr, exec_globals)
                    queue.put(
                        ExecutionResult.load(
                            output=result,
                            process=process_dict,
                            status=ExecutionStatus.SUCCESS,
                        ),
                    )
        except Exception:
            queue.put(
                ExecutionResult.load(
                    error=ErrorDetails.from_current_error(),
                    process=process_dict,
                    status=ExecutionStatus.ERROR,
                ),
            )

        await asyncio.sleep(1)
