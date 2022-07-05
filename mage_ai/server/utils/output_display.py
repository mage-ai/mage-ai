def add_internal_output_info(code: str) -> str:
    code_lines = code.split('\n')
    last_line = code_lines[-1]
    parts = last_line.split('=')
    if len(parts) == 2:
        last_line = parts[0].strip()
    # msg_id = client.execute('\n'.join(code_lines + [
    #     f"f'[__internal_output__]{{{last_line}.__class__.__name__}}'",
    # ]))

    internal_output = f"""
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
    print(f'[__internal_output__]{{json_string}}')
else:
    _internal_output_return
"""

    return f"""
{code}
{internal_output}
"""
