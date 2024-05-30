import asyncio
import traceback
from multiprocessing.queues import Queue


async def execute_code_async(message: str, queue: Queue, uuid: str) -> None:
    exec_globals = {}
    code_lines = message.split('\n')
    print(f'Code lines: {code_lines}')

    for index, line in enumerate(code_lines):
        try:
            print(f'Executing line: {line}')
            code = compile(line, '<string>', 'exec')
            exec(code, exec_globals)

            if line.strip():  # Avoid empty lines
                last_expr = code_lines[index].strip()
                print(f'Last expression: {last_expr}')
                if not last_expr.startswith('#'):  # Avoid comments
                    compiled_expr = compile(last_expr, '<string>', 'eval')
                    result = eval(compiled_expr, exec_globals)
                    event = {
                        'status': 'success',
                        'output': result,
                        'uuid': uuid,
                    }
                    print(
                        f'Evaluated result: {result}',
                        event,
                        queue,
                    )
                    queue.put(event)
                    print(f'Result put in queue: {result}')
        except Exception as err:
            error_msg = traceback.format_exc()
            queue.put({
                'status': 'error',
                'error': err,
                'traceback': error_msg,
                'uuid': uuid,
            })
            print(f'Error encountered: {error_msg}')

        await asyncio.sleep(1)
