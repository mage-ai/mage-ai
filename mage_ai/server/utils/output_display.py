from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple, Union

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

        return '\n'.join(
            parts[start_index + 1 : -1],
        ).replace('"', '\\"'), variable  # ruff: ignore=E203

    return None, None


def add_internal_output_info(
    block, code: str, extension_uuid: Optional[str] = None, widget: bool = False
) -> str:
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

        pipeline_uuid = block.pipeline.uuid if block.pipeline else None
        repo_path = block.pipeline.repo_path if block.pipeline else None
        block_uuid = block.uuid

        replacements = [
            ('DATAFRAME_ANALYSIS_MAX_COLUMNS', DATAFRAME_ANALYSIS_MAX_COLUMNS),
            ('DATAFRAME_SAMPLE_COUNT_PREVIEW', DATAFRAME_SAMPLE_COUNT_PREVIEW),
            ('block_uuid', f"'{block_uuid}'"),
            ('has_reduce_output', has_reduce_output),
            ('is_dynamic', is_dynamic),
            ('is_dynamic_child', is_dynamic_child),
            ('is_print_statement', is_print_statement),
            ('last_line', last_line),
            ('pipeline_uuid', f"'{pipeline_uuid}'"),
            ('repo_path', f"'{repo_path}'"),
            ('widget', widget),
        ]
        replacements.append((
            'extension_uuid',
            f"'{extension_uuid}'" if extension_uuid else 'None',
        ))

        custom_output_function_code = __interpolate_code_content(
            'custom_output.py',
            replacements,
        )

        internal_output = f"""
# Post processing code below (source: output_display.py)

{custom_output_function_code}

__custom_output()
"""

        custom_code = f"""{code_without_last_line}
{internal_output}
"""

        return custom_code


def __interpolate_code_content(
    file_name: str,
    replacements: List[Tuple[str, Union[bool, float, int, str, Dict[str, Any]]]],
) -> str:
    current_directory = os.path.dirname(__file__)
    path_to_file = os.path.join(current_directory, file_name)

    with open(path_to_file, 'r') as file:
        content = file.read()

        for placeholder, replacement in replacements:
            placeholder_pattern = f"'{{{placeholder}}}'"
            content = re.sub(placeholder_pattern, str(replacement), content)

        return content


def add_execution_code(
    pipeline_uuid: str,
    block_uuid: str,
    code: str,
    global_vars,
    repo_path: str,
    block_type: Optional[BlockType] = None,
    execution_uuid: Optional[str] = None,
    extension_uuid: Optional[str] = None,
    kernel_name: Optional[str] = None,
    output_messages_to_logs: bool = False,
    pipeline_config: Optional[Dict] = None,
    pipeline_config_json_encoded: Optional[str] = None,
    repo_config: Optional[Dict] = None,
    repo_config_json_encoded: Optional[str] = None,
    run_incomplete_upstream: bool = False,
    run_settings: Optional[Dict] = None,
    run_tests: bool = False,
    run_upstream: bool = False,
    update_status: bool = True,
    upstream_blocks: Optional[List[str]] = None,
    variables: Optional[Dict] = None,
    widget: bool = False,
) -> str:
    escaped_code = code.replace("'''", '"""').replace("\\", "\\\\")

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
    elif pipeline_config and pipeline_config['type'] == 'databricks':
        spark_session_init = """
from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()
"""

    replacements = [
        ('DATAFRAME_SAMPLE_COUNT_PREVIEW', DATAFRAME_SAMPLE_COUNT_PREVIEW),
        ('block_uuid', f"'{block_uuid}'"),
        (
            'escaped_code',
            f"""r\'\'\'
{escaped_code}
\'\'\'""",
        ),
        ('global_vars', global_vars),
        ('output_messages_to_logs', output_messages_to_logs),
        ('pipeline_config_json_encoded', f"'{pipeline_config_json_encoded}'"),
        ('pipeline_uuid', f"'{pipeline_uuid}'"),
        ('repo_config_json_encoded', f"'{repo_config_json_encoded}'"),
        ('repo_path', f"'{repo_path}'"),
        ('run_incomplete_upstream', run_incomplete_upstream),
        ('run_settings_json', f"'{run_settings_json}'"),
        ('run_tests', run_tests),
        ('run_upstream', run_upstream),
        ('spark', 'spark'),
        ('spark_session_init', f"'{spark_session_init}'"),
        ('update_status', update_status),
        ('variables', variables),
        ('widget', widget),
    ]

    if execution_uuid:
        replacements.append(('execution_uuid', f"'{execution_uuid}'"))

    replacements.append(('extension_uuid', f"'{extension_uuid}'" if extension_uuid else 'None'))

    if upstream_blocks:
        upstream_blocks = ', '.join([f"'{u}'" for u in upstream_blocks])
        upstream_blocks = f'[{upstream_blocks}]'
        replacements.append(('upstream_blocks', upstream_blocks))

    code_content = __interpolate_code_content('execute_custom_code.py', replacements)

    return f"""{magic_header}

import datetime

{code_content}

df = execute_custom_code()
"""


def get_block_output_process_code(
    pipeline_uuid: str,
    block_uuid: str,
    repo_path: str,
    block_type: Optional[BlockType] = None,
    kernel_name: Optional[str] = None,
):
    if kernel_name != KernelName.PYSPARK or block_type not in [
        BlockType.DATA_LOADER,
        BlockType.TRANSFORMER,
    ]:
        return None
    return f"""%%local
from mage_ai.data_preparation.models.constants import BlockStatus
from mage_ai.data_preparation.models.pipeline import Pipeline

import pandas

block_uuid=\'{block_uuid}\'
pipeline = Pipeline(
    uuid=\'{pipeline_uuid}\',
    repo_path=\'{repo_path}\',
)
block = pipeline.get_block(block_uuid)
variable_mapping = dict(df=df)
block.store_variables(variable_mapping)
block.analyze_outputs(variable_mapping)
block.update_status(BlockStatus.EXECUTED)
    """


def get_pipeline_execution_code(
    pipeline_uuid: str,
    repo_path: str,
    global_vars: Optional[Dict] = None,
    kernel_name: str = None,
    pipeline_config: Optional[Dict] = None,
    repo_config: Optional[Dict] = None,
    update_status: bool = True,
) -> str:
    spark_session_init = ''
    if pipeline_config['type'] == 'databricks':
        spark_session_init = """
from pyspark.sql import SparkSession
import os
spark = SparkSession.builder.master(os.getenv('SPARK_MASTER_HOST', 'local')).getOrCreate()
"""

    return f"""
from mage_ai.data_preparation.models.pipeline import Pipeline
import asyncio

{spark_session_init}

def execute_pipeline():
    pipeline = Pipeline(
        uuid=\'{pipeline_uuid}\',
        repo_path=\'{repo_path}\',
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
