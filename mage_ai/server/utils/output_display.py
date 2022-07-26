from mage_ai.data_preparation.models.constants import (
    DATAFRAME_SAMPLE_COUNT_PREVIEW,
)
from mage_ai.server.kernels import KernelName
from typing import Dict, List
import re


REGEX_PATTERN = r'^[ ]{2,}[\w]+'


def remove_comments(code_lines: List[str]) -> List[str]:
    return list(
        filter(
            lambda x: not re.search(r'^\#', str(x).strip()),
            code_lines,
        )
    )


def remove_empty_last_lines(code_lines: List[str]) -> List[str]:
    idx = len(code_lines) - 1
    last_line = code_lines[idx]
    while idx >= 0 and len(str(last_line).strip()) == 0:
        idx -= 1
        last_line = code_lines[idx]
    return code_lines[: (idx + 1)]


def find_index_of_last_expression_lines(code_lines: List[str]) -> int:
    starting_index = len(code_lines) - 1

    brackets_close = code_lines[starting_index].count('}')
    brackets_open = code_lines[starting_index].count('{')
    paranthesis_close = code_lines[starting_index].count(')')
    paranthesis_open = code_lines[starting_index].count('(')
    square_brackets_close = code_lines[starting_index].count(']')
    square_brackets_open = code_lines[starting_index].count('[')

    while starting_index >= 0 and (
        brackets_close > brackets_open
        or paranthesis_close > paranthesis_open
        or square_brackets_close > square_brackets_open
    ):

        starting_index -= 1

        brackets_close += code_lines[starting_index].count('}')
        brackets_open += code_lines[starting_index].count('{')
        paranthesis_close += code_lines[starting_index].count(')')
        paranthesis_open += code_lines[starting_index].count('(')
        square_brackets_close += code_lines[starting_index].count(']')
        square_brackets_open += code_lines[starting_index].count('[')

    return starting_index


def add_internal_output_info(code: str) -> str:
    code_lines = remove_comments(code.split('\n'))
    code_lines = remove_empty_last_lines(code_lines)

    starting_index = find_index_of_last_expression_lines(code_lines)
    if starting_index < len(code_lines) - 1:
        last_line = ' '.join(code_lines[starting_index:])
        code_lines = code_lines[:starting_index] + [last_line]
    else:
        last_line = code_lines[len(code_lines) - 1]

    matches = re.search('^[ ]*([^{^(^\[^=^ ]+)[ ]*=[ ]*', last_line)
    if matches:
        # Get the variable name in the last line if the last line is a variable assignment
        last_line = matches.group(1)
    last_line = last_line.strip()

    is_print_statement = False
    if re.findall(r'print\(', last_line):
        is_print_statement = True

    last_line_in_block = False
    if len(code_lines) >= 2:
        if re.search(REGEX_PATTERN, code_lines[-2]) or re.search(REGEX_PATTERN, code_lines[-1]):
            last_line_in_block = True
    elif re.search(r'^import[ ]{1,}|^from[ ]{1,}', code_lines[-1].strip()):
        last_line_in_block = True

    if not last_line or last_line_in_block:
        return f"""
{code}
"""
    else:
        if matches:
            end_index = len(code_lines)
        else:
            end_index = -1
        code_without_last_line = '\n'.join(code_lines[:end_index])
        internal_output = f"""
# Post processing code below (source: output_display.py)


def __custom_output():
    from datetime import datetime
    from mage_ai.shared.parsers import encode_complex
    import pandas as pd
    import simplejson


    _internal_output_return = {last_line}

    if isinstance(_internal_output_return, pd.DataFrame):
        _sample = _internal_output_return.iloc[:{DATAFRAME_SAMPLE_COUNT_PREVIEW}]
        _columns = _sample.columns.tolist()[:40]
        _rows = _sample.to_numpy().tolist()
        _shape = _internal_output_return.shape
        _index = _sample.index.tolist()

        _json_string = simplejson.dumps(
            dict(
                data=dict(
                    columns=_columns,
                    index=_index,
                    rows=_rows,
                    shape=_shape,
                ),
                type='table',
            ),
            default=encode_complex,
            ignore_nan=True,
        )
        return print(f'[__internal_output__]{{_json_string}}')
    elif not {is_print_statement}:
        return encode_complex(_internal_output_return)

    return

__custom_output()
"""

        custom_code = f"""
{code_without_last_line}
{internal_output}
"""

        return custom_code


def add_execution_code(
    pipeline_uuid: str,
    block_uuid: str,
    code: str,
    global_vars,
    analyze_outputs: bool = True,
    kernel_name: str = None,
    pipeline_config: Dict = None,
    repo_config: Dict = None,
    run_upstream: bool = False,
    update_status: bool = True,
    widget: bool = False,
) -> str:
    escaped_code = code.replace("'", "\\'")

    if kernel_name == KernelName.PYSPARK:
        global_vars_spark = 'global_vars[\'spark\'] = spark'
    else:
        global_vars_spark = ''
    return f"""
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.shared.array import find
import pandas as pd

def execute_custom_code():
    block_uuid=\'{block_uuid}\'
    run_upstream={str(run_upstream)}
    pipeline = Pipeline(
        uuid=\'{pipeline_uuid}\',
        config={pipeline_config},
        repo_config={repo_config},
    )
    block = pipeline.get_block(block_uuid, widget={widget})

    code = \'\'\'
{escaped_code}
    \'\'\'

    if run_upstream:
        block.run_upstream_blocks()

    global_vars = {global_vars} or dict()
    {global_vars_spark}

    block_output = block.execute_sync(
        custom_code=code,
        global_vars=global_vars,
        analyze_outputs={analyze_outputs},
        update_status={update_status},
    )
    output = block_output['output']

    if {widget}:
        return output
    else:
        return find(lambda val: type(val) == pd.DataFrame, output)

execute_custom_code()
    """
