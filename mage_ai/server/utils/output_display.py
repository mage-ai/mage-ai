from mage_ai.data_preparation.models.constants import (
    BlockType,
    DATAFRAME_ANALYSIS_MAX_COLUMNS,
    DATAFRAME_SAMPLE_COUNT_PREVIEW,
)
from mage_ai.server.kernels import KernelName
from mage_ai.shared.code import is_pyspark_code
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


def get_content_inside_triple_quotes(parts):
    parts_length = len(parts) - 1
    start_index = None

    for i in range(parts_length):
        idx = parts_length - (i + 1)
        part = parts[idx]
        if re.search('"""', part):
            start_index = idx

        if start_index is not None:
            break

    if start_index is not None:
        first_line = parts[start_index]

        variable = None
        if re.search('[\w]+[ ]*=[ ]*[f]*"""', first_line):
            variable = first_line.split('=')[0].strip()

        return '\n'.join(parts[start_index + 1:-1]).replace('\"', '\\"'), variable

    return None, None


def add_internal_output_info(code: str) -> str:
    if code.startswith('%%sql') or code.startswith('%%bash'):
        return code
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

    if re.search('"""$', last_line):
        triple_quotes_content, variable = get_content_inside_triple_quotes(code_lines)
        if variable:
            return f'{code}\nprint({variable})'
        elif triple_quotes_content:
            return f'{code}\nprint("""\n{triple_quotes_content}\n""")'

    if not last_line or last_line_in_block or re.match('^from|^import|^\%\%', last_line.strip()):
        return code
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
    from pandas.core.common import SettingWithCopyWarning
    import json
    import pandas as pd
    import simplejson
    import warnings


    warnings.simplefilter(action='ignore', category=SettingWithCopyWarning)


    _internal_output_return = {last_line}

    if isinstance(_internal_output_return, pd.DataFrame) and (
        type(_internal_output_return).__module__ != 'geopandas.geodataframe'
    ):
        _sample = _internal_output_return.iloc[:{DATAFRAME_SAMPLE_COUNT_PREVIEW}]
        _columns = _sample.columns.tolist()[:{DATAFRAME_ANALYSIS_MAX_COLUMNS}]
        _rows = json.loads(_sample.to_json(orient='split'))['data']
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
    elif type(_internal_output_return).__module__ == 'pyspark.sql.dataframe':
        _sample = _internal_output_return.limit({DATAFRAME_SAMPLE_COUNT_PREVIEW}).toPandas()
        _columns = _sample.columns.tolist()[:40]
        _rows = _sample.to_numpy().tolist()
        _shape = [_internal_output_return.count(), len(_sample.columns.tolist())]
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

        custom_code = f"""{code_without_last_line}
{internal_output}
"""

        return custom_code


def add_execution_code(
    pipeline_uuid: str,
    block_uuid: str,
    code: str,
    global_vars,
    analyze_outputs: bool = True,
    block_type: BlockType = None,
    kernel_name: str = None,
    pipeline_config: Dict = None,
    repo_config: Dict = None,
    run_tests: bool = False,
    run_upstream: bool = False,
    update_status: bool = True,
    widget: bool = False,
) -> str:
    escaped_code = code.replace("'''", "\"\"\"")

    global_vars_spark = ''
    magic_header = ''
    if kernel_name == KernelName.PYSPARK:
        if block_type == BlockType.CHART or (
            block_type == BlockType.SENSOR and not is_pyspark_code(code)
        ):
            global_vars_spark = ''
            magic_header = '%%local'
            run_upstream = False
        else:
            global_vars_spark = 'global_vars[\'spark\'] = spark'
            if block_type in [BlockType.DATA_LOADER, BlockType.TRANSFORMER]:
                magic_header = '%%spark -o df --maxrows 10000'

    return f"""{magic_header}
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.orchestration.db import db_connection
from mage_ai.shared.array import find
import datetime
import pandas as pd

db_connection.start_session()

def execute_custom_code():
    block_uuid=\'{block_uuid}\'
    run_upstream={str(run_upstream)}
    pipeline = Pipeline(
        uuid=\'{pipeline_uuid}\',
        config={pipeline_config},
        repo_config={repo_config},
    )
    block = pipeline.get_block(block_uuid, widget={widget})

    code = r\'\'\'
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
        test_execution=True,
    )
    if {run_tests}:
        block.run_tests(custom_code=code, update_tests=False)
    output = block_output['output']

    if {widget}:
        return output
    else:
        return find(lambda val: val is not None, output)

df = execute_custom_code()
    """


def get_block_output_process_code(
    pipeline_uuid: str,
    block_uuid: str,
    block_type: BlockType = None,
    kernel_name: str = None,

):
    if kernel_name != KernelName.PYSPARK or \
            block_type not in [BlockType.DATA_LOADER, BlockType.TRANSFORMER]:
        return None
    return f"""%%local
from mage_ai.data_preparation.models.constants import BlockStatus
from mage_ai.data_preparation.models.pipeline import Pipeline

import pandas

block_uuid=\'{block_uuid}\'
pipeline = Pipeline(
    uuid=\'{pipeline_uuid}\',
)
block = pipeline.get_block(block_uuid)
variable_mapping = dict(df=df)
block.store_variables(variable_mapping)
block.analyze_outputs(variable_mapping)
block.update_status(BlockStatus.EXECUTED)
    """


def get_pipeline_execution_code(
    pipeline_uuid: str,
    global_vars: Dict = None,
    kernel_name: str = None,
    pipeline_config: Dict = None,
    repo_config: Dict = None,
    update_status: bool = True,
) -> str:
    if kernel_name == KernelName.PYSPARK:
        global_vars_spark = 'global_vars[\'spark\'] = spark'
    else:
        global_vars_spark = ''
    return f"""
from mage_ai.data_preparation.models.pipeline import Pipeline
import asyncio

def execute_pipeline():
    pipeline = Pipeline(
        uuid=\'{pipeline_uuid}\',
        config={pipeline_config},
        repo_config={repo_config},
    )

    global_vars = {global_vars} or dict()
    {global_vars_spark}

    asyncio.run(pipeline.execute(
        analyze_outputs=False,
        global_vars=global_vars,
        update_status={update_status},
    ))
execute_pipeline()
    """
