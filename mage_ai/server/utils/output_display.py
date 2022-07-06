import re


def add_internal_output_info(code: str) -> str:
    code_lines = code.split('\n')
    last_line = code_lines[-1]
    parts = last_line.split('=')
    if len(parts) == 2:
        last_line = parts[0]
    last_line = last_line.strip()

    is_print_statement = False
    if re.findall(r'print\(', last_line):
        is_print_statement = True

    code_without_last_line = '\n'.join(code_lines[:-1])

    print(last_line)

    internal_output = f"""
from datetime import datetime
import pandas as pd
import simplejson


def __custom_output():
    _internal_output_return = {last_line}

    if isinstance(_internal_output_return, pd.DataFrame):
        columns = _internal_output_return.columns.tolist()
        rows = _internal_output_return.to_numpy().tolist()

        json_string = simplejson.dumps(
            dict(
                data=dict(columns=columns, rows=rows),
                type='table',
            ),
            default=datetime.isoformat,
            ignore_nan=True,
        )
        return print(f'[__internal_output__]{{json_string}}')
    elif not {is_print_statement}:
        return _internal_output_return

    return

__custom_output()
"""

    return f"""
{code_without_last_line}
{internal_output}
"""
