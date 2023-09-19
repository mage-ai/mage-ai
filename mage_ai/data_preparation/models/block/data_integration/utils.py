import importlib
import json
import os
import subprocess
from logging import Logger
from typing import Any, Dict, List

import pandas as pd
import yaml

from mage_ai.data_integrations.logger.utils import print_log_from_line
from mage_ai.data_integrations.utils.config import build_config
from mage_ai.data_preparation.models.block.data_integration.constants import (
    REPLICATION_METHOD_INCREMENTAL,
    STATE_FILENAME,
)
from mage_ai.data_preparation.models.constants import (
    PYTHON_COMMAND,
    BlockLanguage,
    BlockType,
)
from mage_ai.data_preparation.models.pipelines.utils import number_string
from mage_ai.shared.array import find
from mage_ai.shared.hash import extract, merge_dict
from mage_ai.shared.security import filter_out_config_values
from mage_ai.shared.utils import clean_name


def get_destination(block) -> str:
    if BlockType.DATA_EXPORTER == block.type and \
            BlockLanguage.YAML == block.language and \
            block.content:

        config = yaml.safe_load(block.content)

        return config.get('destination')


def get_source(block) -> str:
    if BlockType.DATA_LOADER == block.type and \
            BlockLanguage.YAML == block.language and \
            block.content:

        config = yaml.safe_load(block.content)

        return config.get('source')


def is_source(block) -> bool:
    if get_source(block):
        return True

    return False


def is_destination(block) -> bool:
    if get_destination(block):
        return True

    return False


def execute_destination(
    block,
    outputs_from_input_vars,
    execution_partition: str = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    input_vars: List = None,
    logger: Logger = None,
    logging_tags: Dict = None,
    input_from_output: Dict = None,
    runtime_arguments: Dict = None,
    **kwargs,
) -> List:
    pass


def output_filename(index: int) -> str:
    return number_string(index)


def get_source_state_file_path(block, stream: str) -> str:
    # ~/.mage_data/default_repo/pipelines/:pipeline_uuid/:block_uuid/:source/:stream
    full_path = os.path.join(
        block.pipeline.pipeline_variables_dir,
        block.uuid,
        get_source(block),
        clean_name(stream),
    )

    os.makedirs(full_path, exist_ok=True)

    file_path = os.path.join(full_path, STATE_FILENAME)

    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            f.write(json.dumps(dict(bookmarks={})))

    return file_path


def variable_directory(block, stream: str) -> str:
    return os.path.join(get_source(block), clean_name(stream))


def source_module(source_uuid: str) -> Any:
    return importlib.import_module(f'mage_integrations.sources.{source_uuid}')


def source_module_file_path(source_uuid: str) -> str:
    source_mod = source_module(source_uuid)
    try:
        if source_mod:
            return os.path.abspath(source_mod.__file__)
    except Exception:
        if source_uuid:
            mod1 = importlib.import_module('mage_integrations.sources')
            absolute_path = os.path.join(*mod1.__file__.split(os.path.sep)[:-1])
            absolute_path = os.path.join(absolute_path, source_uuid, '__init__.py')

            return absolute_path


def get_catalog_by_stream(catalog: Dict, stream: str) -> Dict:
    return find(
        lambda x: x['tap_stream_id'] == stream,
        catalog.get('catalog', {}).get('streams', []),
    )


def execute_source(
    block,
    outputs_from_input_vars,
    execution_partition: str = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    input_vars: List = None,
    logger: Logger = None,
    logging_tags: Dict = None,
    input_from_output: Dict = None,
    runtime_arguments: Dict = None,
    data_integration_module_file_path: str = None,
    **kwargs,
) -> List:
    from mage_integrations.sources.constants import BATCH_FETCH_LIMIT

    if logging_tags is None:
        logging_tags = dict()

    index = block.template_runtime_configuration.get('index', 0)
    is_last_block_run = block.template_runtime_configuration.get('is_last_block_run', False)
    selected_streams = block.template_runtime_configuration.get('selected_streams', [])
    # TESTING PURPOSES ONLY
    if not selected_streams:
        catalog = block.pipeline.get_block_catalog(block.uuid)
        selected_streams = \
            [s.get('tap_stream_id') for s in catalog.get('catalog', {}).get('streams', [])]

    stream = selected_streams[0] if len(selected_streams) >= 1 else None
    destination_table = block.template_runtime_configuration.get('destination_table', stream)
    query_data = runtime_arguments or {}
    query_data = query_data.copy()

    tags = dict(block_tags=dict(
        destination_table=destination_table,
        index=index,
        stream=stream,
        type=block.type,
        uuid=block.uuid,
    ))
    updated_logging_tags = merge_dict(
        logging_tags,
        dict(tags=tags),
    )

    variables_dictionary_for_config = merge_dict(global_vars, {
        'pipeline.name': block.pipeline.name if block.pipeline else None,
        'pipeline.uuid': block.pipeline.uuid if block.pipeline else None,
    })

    catalog = block.pipeline.get_block_catalog(block.uuid)

    # Handle incremental sync
    source_state_file_path = None
    if index is not None:
        source_state_file_path = get_source_state_file_path(block, stream)

        stream_catalog = get_catalog_by_stream(catalog, stream) or {}

        if REPLICATION_METHOD_INCREMENTAL == stream_catalog.get('replication_method'):
            # Use the state to adjust the query
            # How do we write to the state when the source syncs can run in parallel?
            pass
        else:
            query_data['_offset'] = BATCH_FETCH_LIMIT * index
        if not is_last_block_run:
            query_data['_limit'] = BATCH_FETCH_LIMIT

    source_uuid = get_source(block)

    # The output file nested in the variables directory must contain the stream and the index
    # because a single block can have multiple streams with multiple indexes each due to fan out.
    variable_uuid = variable_directory(block, stream)
    variable = block.pipeline.variable_manager.build_variable(
        block.pipeline.uuid,
        block.uuid,
        variable_uuid,
        execution_partition,
    )

    filename = output_filename(index)
    output_file_path = variable.full_path(filename)

    lines_in_file = 0
    outputs = []
    config, config_json = build_config(
        None,
        variables_dictionary_for_config,
        content=block.content,
    )

    args = [
        PYTHON_COMMAND,
        data_integration_module_file_path or source_module_file_path(source_uuid),
        '--config_json',
        config_json,
        '--log_to_stdout',
        '1',
        '--settings',
        block.pipeline.get_block_catalog_file_path(block.uuid),
        '--query_json',
        json.dumps(query_data),
    ]

    if source_state_file_path:
        args += [
            '--state',
            source_state_file_path,
        ]

    if len(selected_streams) >= 1:
        args += [
            '--selected_streams_json',
            json.dumps(selected_streams),
        ]

    proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

    with variable.open_to_write(filename) as f:
        for line in proc.stdout:
            f.write(line.decode()),
            print_log_from_line(
                line,
                config=config,
                logger=logger if not from_notebook else None,
                logging_tags=logging_tags,
                tags=tags,
            )
            lines_in_file += 1

    outputs.append(proc)

    proc.communicate()
    if proc.returncode != 0 and proc.returncode is not None:
        cmd = proc.args if isinstance(proc.args, str) else str(proc.args)
        raise subprocess.CalledProcessError(
            proc.returncode,
            filter_out_config_values(cmd, config),
        )

    if os.path.exists(output_file_path):
        file_size = os.path.getsize(output_file_path)
        msg = f'Finished writing {file_size} bytes with {lines_in_file} lines to output '\
            f'file {output_file_path}.'
        if logger and not from_notebook:
            logger.info(msg, **updated_logging_tags)
        else:
            print(msg)

        if from_notebook:
            df = convert_outputs_to_dataframe(
                [output_file_path],
                stream,
                catalog,
            )

            return [df]

    return outputs


def convert_outputs_to_dataframe(
    output_file_paths: List[str],
    stream: str,
    catalog: Dict,
) -> pd.DataFrame:
    stream_settings = get_catalog_by_stream(catalog, stream)
    schema_properties = stream_settings.get('schema', {}).get('properties', {})
    columns = []

    for md in stream_settings.get('metadata', []):
        breadcrumb = md.get('breadcrumb', [])
        if breadcrumb:
            column = breadcrumb[-1]
            if md.get('metadata', {}).get('selected', False):
                columns.append(dict(
                    column=column,
                    properties=schema_properties.get(column),
                ))

    columns_to_select = [d.get('column') for d in columns]

    rows = []
    for output_file_path in output_file_paths:
        with open(output_file_path) as f:
            for line in f:
                try:
                    row = json.loads(line)
                    record = row.get('record')
                    if record and stream == row.get('stream'):
                        rows.append(extract(record, columns_to_select))
                except json.JSONDecodeError:
                    pass

    return pd.DataFrame(rows)
