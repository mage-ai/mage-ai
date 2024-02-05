import json
import re
from typing import Dict, List

from mage_ai.data_preparation.models.block.dynamic.utils import (
    has_reduce_output_from_upstreams,
    is_dynamic_block,
    is_dynamic_block_child,
)
from mage_ai.data_preparation.models.constants import (
    DATAFRAME_ANALYSIS_MAX_COLUMNS,
    DATAFRAME_SAMPLE_COUNT_PREVIEW,
    BlockType,
)
from mage_ai.server.kernels import KernelName
from mage_ai.shared.code import is_pyspark_code

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
        if re.search(r'[\w]+[ ]*=[ ]*[f]*"""', first_line):
            variable = first_line.split('=')[0].strip()

        return '\n'.join(parts[start_index + 1:-1]).replace('\"', '\\"'), variable

    return None, None


def add_internal_output_info(block, code: str) -> str:
    if code.startswith('%%sql') or code.startswith('%%bash') or len(code) == 0:
        return code
    code_lines = remove_comments(code.split('\n'))
    code_lines = remove_empty_last_lines(code_lines)

    starting_index = find_index_of_last_expression_lines(code_lines)
    if starting_index < len(code_lines) - 1:
        last_line = ' '.join(code_lines[starting_index:])
        code_lines = code_lines[:starting_index] + [last_line]
    else:
        last_line = code_lines[len(code_lines) - 1]

    matches = re.search(r'^[ ]*([^{^(^\[^=^ ]+)[ ]*=[ ]*', last_line)
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

    if not last_line or last_line_in_block or re.match(r'^from|^import|^\%\%', last_line.strip()):
        return code
    else:
        if matches:
            end_index = len(code_lines)
        else:
            end_index = -1
        code_without_last_line = '\n'.join(code_lines[:end_index])

        has_reduce_output = has_reduce_output_from_upstreams(block) if block else False
        is_dynamic = is_dynamic_block(block) if block else False
        is_dynamic_child = is_dynamic_block_child(block) if block else False

        internal_output = f"""
# Post processing code below (source: output_display.py)


def __custom_output():
    import json
    import warnings
    from datetime import datetime

    import pandas as pd
    import polars as pl
    import simplejson

    from mage_ai.data_preparation.models.block.dynamic.utils import transform_output_for_display
    from mage_ai.data_preparation.models.block.dynamic.utils import (
        combine_transformed_output_for_multi_output,
        transform_output_for_display_dynamic_child,
        transform_output_for_display_reduce_output,
    )
    from mage_ai.shared.environments import is_debug
    from mage_ai.shared.parsers import encode_complex, sample_output


    if pd.__version__ < '1.5.0':
        from pandas.core.common import SettingWithCopyWarning
    else:
        from pandas.errors import SettingWithCopyWarning

    warnings.simplefilter(action='ignore', category=SettingWithCopyWarning)

    _internal_output_return = {last_line}

    # Dynamic block child logic always takes precedence over dynamic block logic
    if bool({is_dynamic_child}):
        output_transformed = []

        if _internal_output_return and isinstance(_internal_output_return, list):
            for output in _internal_output_return:
                output_tf = transform_output_for_display_dynamic_child(
                    output,
                    is_dynamic=bool({is_dynamic}),
                    sample_count={DATAFRAME_ANALYSIS_MAX_COLUMNS},
                )
                output_transformed.append(output_tf)

        output_transformed = output_transformed[:{DATAFRAME_SAMPLE_COUNT_PREVIEW}]

        try:
            _json_string = simplejson.dumps(
                combine_transformed_output_for_multi_output(output_transformed),
                default=encode_complex,
                ignore_nan=True,
            )

            return print(f'[__internal_output__]{{_json_string}}')
        except Exception as err:
            print(type(_internal_output_return))
            print(type(output_transformed))
            raise err
    elif bool({is_dynamic}):
        _json_string = simplejson.dumps(
            transform_output_for_display(
                _internal_output_return,
                sample_count={DATAFRAME_ANALYSIS_MAX_COLUMNS},
            ),
            default=encode_complex,
            ignore_nan=True,
        )
        return print(f'[__internal_output__]{{_json_string}}')
    elif bool({has_reduce_output}):
        _json_string = simplejson.dumps(
            transform_output_for_display_reduce_output(
                _internal_output_return,
                sample_count={DATAFRAME_ANALYSIS_MAX_COLUMNS},
            ),
            default=encode_complex,
            ignore_nan=True,
        )
        return print(f'[__internal_output__]{{_json_string}}')
    elif isinstance(_internal_output_return, pd.DataFrame) and (
        type(_internal_output_return).__module__ != 'geopandas.geodataframe'
    ):
        _sample = _internal_output_return.iloc[:{DATAFRAME_SAMPLE_COUNT_PREVIEW}]
        _columns = _sample.columns.tolist()[:{DATAFRAME_ANALYSIS_MAX_COLUMNS}]
        _rows = simplejson.loads(_sample[_columns].fillna('').to_json(
            default_handler=str,
            orient='split',
        ))['data']
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
    elif isinstance(_internal_output_return, pl.DataFrame):
        return print(_internal_output_return)
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
        output, sampled = sample_output(encode_complex(_internal_output_return))
        if sampled:
            print('Sampled output is provided here for preview.')
        return output

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
    block_type: BlockType = None,
    execution_uuid: str = None,
    extension_uuid: str = None,
    kernel_name: str = None,
    output_messages_to_logs: bool = False,
    pipeline_config: Dict = None,
    repo_config: Dict = None,
    run_incomplete_upstream: bool = False,
    run_settings: Dict = None,
    run_tests: bool = False,
    run_upstream: bool = False,
    update_status: bool = True,
    upstream_blocks: List[str] = None,
    variables: Dict = None,
    widget: bool = False,
) -> str:
    escaped_code = code.replace("'''", "\"\"\"")

    if execution_uuid:
        execution_uuid = f"'{execution_uuid}'"

    if extension_uuid:
        extension_uuid = f"'{extension_uuid}'"
    if upstream_blocks:
        upstream_blocks = ', '.join([f"'{u}'" for u in upstream_blocks])
        upstream_blocks = f'[{upstream_blocks}]'

    run_settings_json = json.dumps(run_settings or {})

    magic_header = ''
    spark_session_init = ''
    if kernel_name == KernelName.PYSPARK:
        if block_type == BlockType.CHART or (
            block_type == BlockType.SENSOR and not is_pyspark_code(code)
        ):
            magic_header = '%%local'
            run_incomplete_upstream = False
            run_upstream = False
        else:
            if block_type in [BlockType.DATA_LOADER, BlockType.TRANSFORMER]:
                magic_header = '%%spark -o df --maxrows 10000'
    elif pipeline_config['type'] == 'databricks':
        spark_session_init = '''
from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()
'''

    return f"""{magic_header}
from mage_ai.data_preparation.models.block.dynamic.utils import build_combinations_for_dynamic_child
from mage_ai.data_preparation.models.block.dynamic.utils import has_reduce_output_from_upstreams
from mage_ai.data_preparation.models.block.dynamic.utils import is_dynamic_block
from mage_ai.data_preparation.models.block.dynamic.utils import is_dynamic_block_child
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.settings.repo import get_repo_path
from mage_ai.orchestration.db import db_connection
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict
import datetime
import json
import logging
import pandas as pd


db_connection.start_session()
{spark_session_init}

if 'context' not in globals():
    context = dict()

def execute_custom_code():
    block_uuid=\'{block_uuid}\'
    run_incomplete_upstream={str(run_incomplete_upstream)}
    run_upstream={str(run_upstream)}
    pipeline = Pipeline(
        uuid=\'{pipeline_uuid}\',
        config={pipeline_config},
        repo_config={repo_config},
    )

    block = pipeline.get_block(block_uuid, extension_uuid={extension_uuid}, widget={widget})

    upstream_blocks = {upstream_blocks}
    if upstream_blocks and len(upstream_blocks) >= 1:
        blocks = pipeline.get_blocks({upstream_blocks})
        block.upstream_blocks = blocks

    code = r\'\'\'
{escaped_code}
    \'\'\'

    global_vars = merge_dict({global_vars} or dict(), pipeline.variables or dict())

    if {variables}:
        global_vars = merge_dict(global_vars, {variables})

    if pipeline.run_pipeline_in_one_process:
        # Use shared context for blocks
        global_vars['context'] = context

    try:
        global_vars[\'spark\'] = spark
    except Exception:
        pass

    if run_incomplete_upstream or run_upstream:
        block.run_upstream_blocks(
            from_notebook=True,
            global_vars=global_vars,
            incomplete_only=run_incomplete_upstream,
        )

    logger = logging.getLogger('{block_uuid}_test')
    logger.setLevel('INFO')
    if 'logger' not in global_vars:
        global_vars['logger'] = logger

    block_output = dict(output=[])
    options = dict(
        custom_code=code,
        execution_uuid={execution_uuid},
        from_notebook=True,
        global_vars=global_vars,
        logger=logger,
        output_messages_to_logs={output_messages_to_logs},
        run_settings=json.loads('{run_settings_json}'),
        update_status={update_status},
    )

    has_reduce_output = has_reduce_output_from_upstreams(block)
    is_dynamic_child = is_dynamic_block_child(block)

    if is_dynamic_child:
        outputs = []
        settings = build_combinations_for_dynamic_child(block, **options)
        for dynamic_block_index, config in enumerate(settings):
            output_dict = block.execute_with_callback(**merge_dict(options, config))
            if output_dict and output_dict.get('output'):
                outputs.append(output_dict.get('output'))

            if {run_tests}:
                block.run_tests(
                    custom_code=code,
                    dynamic_block_index=dynamic_block_index,
                    from_notebook=True,
                    logger=logger,
                    global_vars=global_vars,
                    update_tests=False,
                )

        block_output['output'] = outputs
    else:
        block_output = block.execute_with_callback(**options)

        if {run_tests}:
            block.run_tests(
                custom_code=code,
                from_notebook=True,
                logger=logger,
                global_vars=global_vars,
                update_tests=False,
            )

    output = block_output['output'] or []

    if {widget} or is_dynamic_block(block) or is_dynamic_child or has_reduce_output:
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
    spark_session_init = ''
    if pipeline_config['type'] == 'databricks':
        spark_session_init = '''
from pyspark.sql import SparkSession
import os
spark = SparkSession.builder.master(os.getenv('SPARK_MASTER_HOST', 'local')).getOrCreate()
'''

    return f"""
from mage_ai.data_preparation.models.pipeline import Pipeline
import asyncio

{spark_session_init}

def execute_pipeline():
    pipeline = Pipeline(
        uuid=\'{pipeline_uuid}\',
        config={pipeline_config},
        repo_config={repo_config},
    )

    global_vars = {global_vars} or dict()

    try:
        global_vars[\'spark\'] = spark
    except Exception:
        pass

    asyncio.run(pipeline.execute(
        analyze_outputs=False,
        global_vars=global_vars,
        update_status={update_status},
    ))
execute_pipeline()
    """
