import re


def remove_comments(code_lines):
    return list(filter(
        lambda x: not re.search(r'^\#', str(x).strip()),
        code_lines,
    ))


def add_internal_output_info(code: str) -> str:
    code_lines = remove_comments(code.split('\n'))

    idx = len(code_lines) - 1
    last_line = code_lines[idx]
    while idx >= 0 and len(str(last_line).strip()) == 0:
        idx -= 1
        last_line = code_lines[idx]

    parts = last_line.split('=')
    if len(parts) == 2:
        last_line = parts[0]
    last_line = last_line.strip()

    is_print_statement = False
    if re.findall(r'print\(', last_line):
        is_print_statement = True

    last_line_in_block = False
    if len(code_lines) >= 2:
        line_before_last_line = code_lines[-2]
        if re.search(r'^[ ]{2,}[\w]+', line_before_last_line) and \
           re.search(r'^[ ]{2,}[\w]+', code_lines[-1]):
            last_line_in_block = True

    code_lines_final = []

    if not last_line or last_line_in_block:
        code_lines_final.append(code)
    else:
        end_index = len(code_lines) if len(parts) >= 2 else -1
        code_without_last_line = '\n'.join(code_lines[:end_index])
        internal_output = f"""
# Post processing code below (source: output_display.py)


def __custom_output():
    from datetime import datetime
    import pandas as pd
    import simplejson


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
        code_lines_final.append(code_without_last_line)
        code_lines_final.append(internal_output)

    return '\n'.join(code_lines_final)
