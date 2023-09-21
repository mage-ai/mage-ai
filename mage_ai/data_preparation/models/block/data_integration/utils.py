import importlib
import json
import os
import subprocess
from logging import Logger
from typing import Any, Dict, List

import pandas as pd
import yaml

from mage_ai.data_integrations.logger.utils import print_log_from_line
from mage_ai.data_integrations.utils.parsers import parse_logs_and_json
from mage_ai.data_preparation.models.block.data_integration.constants import (
    EXECUTION_PARTITION_FROM_NOTEBOOK,
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
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.security import filter_out_config_values
from mage_ai.shared.utils import clean_name


def get_destination(block) -> str:
    if BlockType.DATA_EXPORTER == block.type and \
            BlockLanguage.YAML == block.language and \
            block.content:

        config = yaml.safe_load(block.content)

        return config.get('destination')


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


def get_source_state_file_path(block, source_uuid: str, stream: str) -> str:
    # ~/.mage_data/default_repo/pipelines/:pipeline_uuid/:block_uuid/:source/:stream
    full_path = os.path.join(
        block.pipeline.pipeline_variables_dir,
        block.uuid,
        source_uuid,
        clean_name(stream),
    )

    os.makedirs(full_path, exist_ok=True)

    file_path = os.path.join(full_path, STATE_FILENAME)

    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            f.write(json.dumps(dict(bookmarks={})))

    return file_path


def variable_directory(source_uuid: str, stream: str) -> str:
    return os.path.join(source_uuid, clean_name(stream))


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


def extract_stream_ids_from_streams(streams: List[Dict]) -> List[str]:
    return [x['tap_stream_id'] for x in streams]


def get_streams_from_catalog(catalog: Dict, streams: List[str]) -> List[Dict]:
    return list(filter(
        lambda x: x['tap_stream_id'] in streams,
        catalog.get('streams', []),
    ))


def get_selected_streams(catalog: Dict) -> List[Dict]:
    streams = []

    if catalog:
        for stream in catalog.get('streams', []):
            md = stream.get('metadata', [])
            md_find = find(
                lambda x: len(x.get('breadcrumb') or []) == 0,
                md,
            )

            if md_find.get('metadata', {}).get('selected'):
                streams.append(stream)

    return streams


def build_variable(
    block,
    source_uuid: str,
    stream: str,
    execution_partition: str = None,
    from_notebook: bool = False,
):
    # The output file nested in the variables directory must contain the stream and the index
    # because a single block can have multiple streams with multiple indexes each due to fan out.
    if from_notebook:
        partition = EXECUTION_PARTITION_FROM_NOTEBOOK
    else:
        partition = execution_partition

    variable_uuid = variable_directory(source_uuid, stream)
    variable = block.pipeline.variable_manager.build_variable(
        block.pipeline.uuid,
        block.uuid,
        variable_uuid,
        partition,
        clean_variable_uuid=False,
    )

    return variable


def output_full_path(
    block=None,
    execution_partition: str = None,
    from_notebook: bool = False,
    index: int = None,
    source_uuid: str = None,
    stream: str = None,
    variable=None,
) -> str:
    variable_use = variable or build_variable(
        block,
        source_uuid,
        stream,
        execution_partition=execution_partition,
        from_notebook=from_notebook,
    )

    filename = output_filename(index) if index is not None else None
    # Example:
    # /root/.mage_data/default_repo/pipelines/unified_pipeline/.variables
    # /_from_notebook/source_postgresql/postgresql/user_with_emails
    return variable_use.full_path(filename)


def execute_source(
    block,
    outputs_from_input_vars,
    custom_code: str = None,
    execution_partition: str = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    input_vars: List = None,
    logger: Logger = None,
    logging_tags: Dict = None,
    input_from_output: Dict = None,
    runtime_arguments: Dict = None,
    data_integration_runtime_settings: Dict = None,
    dynamic_block_index: int = None,
    dynamic_upstream_block_uuids: List[str] = None,
    **kwargs,
) -> List:
    if logging_tags is None:
        logging_tags = dict()

    data_integration_settings = block.get_data_integration_settings(
        dynamic_block_index=dynamic_block_index,
        dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
        from_notebook=from_notebook,
        global_vars=global_vars,
        input_vars=input_vars,
        partition=execution_partition,
        **kwargs,
    )

    catalog = data_integration_settings.get('catalog')
    config = data_integration_settings.get('config')
    config_json = json.dumps(config)
    source_uuid = data_integration_settings.get('source')

    index = block.template_runtime_configuration.get('index', 0)
    is_last_block_run = block.template_runtime_configuration.get('is_last_block_run', False)
    selected_streams = block.template_runtime_configuration.get('selected_streams', [])
    if not selected_streams:
        selected_streams = data_integration_settings.get('selected_streams')

    # TESTING PURPOSES ONLY
    if not selected_streams and catalog:
        selected_streams = [s.get('tap_stream_id') for s in catalog.get('streams', [])]

    stream = selected_streams[0] if len(selected_streams) >= 1 else None
    query_data = (runtime_arguments or {}).copy()

    if not stream:
        return []

    # Handle incremental sync
    source_state_file_path = None
    if index is not None:
        source_state_file_path = get_source_state_file_path(block, source_uuid, stream)

        stream_catalogs = get_streams_from_catalog(catalog, [stream]) or []

        if len(stream_catalogs) == 1 and \
                REPLICATION_METHOD_INCREMENTAL == stream_catalogs[0].get('replication_method'):
            # Use the state to adjust the query
            # How do we write to the state when the source syncs can run in parallel?
            pass
        else:
            from mage_integrations.sources.constants import BATCH_FETCH_LIMIT
            query_data['_offset'] = BATCH_FETCH_LIMIT * index

        if not is_last_block_run:
            from mage_integrations.sources.constants import BATCH_FETCH_LIMIT
            query_data['_limit'] = BATCH_FETCH_LIMIT

    variable = build_variable(
        block,
        source_uuid,
        stream,
        execution_partition=execution_partition,
        from_notebook=from_notebook,
    )
    output_file_path = output_full_path(
        index=index,
        source_uuid=source_uuid,
        variable=variable,
    )

    lines_in_file = 0
    outputs = []

    module_file_path = None
    if data_integration_runtime_settings:
        module_file_paths = data_integration_runtime_settings.get('module_file_paths', {})
        sources_file_paths = module_file_paths.get('sources', {})
        module_file_path = sources_file_paths.get(source_uuid)

    if not module_file_path:
        module_file_path = source_module_file_path(source_uuid)

    args = [
        PYTHON_COMMAND,
        module_file_path,
        '--config_json',
        config_json,
        '--log_to_stdout',
        '1',
        '--query_json',
        json.dumps(query_data),
    ]

    if BlockLanguage.PYTHON == block.language:
        args += [
            '--catalog_json',
            json.dumps(catalog),
        ]
    else:
        args += [
            '--catalog',
            block.get_catalog_file_path(),
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

    tags = dict(block_tags=dict(
        index=index,
        stream=stream,
        type=block.type,
        uuid=block.uuid,
    ))

    filename = output_filename(index) if index is not None else None
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

        updated_logging_tags = merge_dict(
            logging_tags,
            dict(tags=tags),
        )

        if logger and not from_notebook:
            logger.info(msg, **updated_logging_tags)
        else:
            print(msg)

        if from_notebook:
            d = convert_outputs_to_data(
                block,
                catalog,
                from_notebook=from_notebook,
                index=index,
                partition=execution_partition,
                source_uuid=source_uuid,
                stream_id=stream,
            )

            return [pd.DataFrame(d['rows'], columns=d['columns'])]

    return outputs


def convert_outputs_to_data(
    block,
    catalog: Dict,
    from_notebook: bool = False,
    index: int = None,
    partition: str = None,
    source_uuid: str = None,
    stream_id: str = None,
    sample_count: int = None,
) -> Dict:
    variable = build_variable(
        block,
        source_uuid,
        stream_id,
        execution_partition=partition,
        from_notebook=from_notebook,
    )

    output_file_paths = []

    output_file_path = output_full_path(
        index=index,
        source_uuid=source_uuid,
        variable=variable,
    )

    if index is None:
        if os.path.exists(output_file_path):
            for filename in os.listdir(output_file_path):
                output_file_paths.append(os.path.join(output_file_path, filename))
    else:
        output_file_paths.append(output_file_path)
    output_file_paths.sort()

    columns_to_select = []
    rows = []
    stream_settings = {}
    row_count = 0

    streams = get_streams_from_catalog(catalog, [stream_id])
    if streams:
        stream_settings = streams[0]
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

        for output_file_path in output_file_paths:
            with open(output_file_path) as f:
                for line in f:
                    try:
                        if sample_count is not None and row_count >= sample_count:
                            break

                        row = json.loads(line)
                        record = row.get('record')
                        if record and stream_id == row.get('stream'):
                            rows.append([record.get(col) for col in columns_to_select])
                            row_count += 1
                    except json.JSONDecodeError:
                        pass

    if sample_count is not None:
        rows = rows[:sample_count]

    return dict(
        columns=columns_to_select,
        rows=rows,
        stream=stream_settings,
    )


def discover(source_uuid: str, config: Dict, streams: List[str] = None) -> Dict:
    run_args = [
        PYTHON_COMMAND,
        source_module_file_path(source_uuid),
        '--config_json',
        json.dumps(config),
        '--discover',
    ]

    if streams:
        run_args += [
            '--selected_streams_json',
            json.dumps(streams),
        ]

    return json.loads(
        __run_in_subprocess(
            run_args,
            config=config,
        )
    )


def discover_streams(source_uuid: str, config: Dict) -> List[str]:
    return json.loads(
        __run_in_subprocess(
            [
                PYTHON_COMMAND,
                source_module_file_path(source_uuid),
                '--config_json',
                json.dumps(config),
                '--discover',
                '--discover_streams',
            ],
            config=config,
        )
    )


def select_streams_in_catalog(catalog: Dict, selected_streams: List[str]) -> Dict:
    if not selected_streams:
        return catalog

    catalog_copy = catalog.copy()

    streams = []
    for stream in catalog.get('streams', []):
        if stream['tap_stream_id'] not in selected_streams:
            continue

        metadata = []
        for md in stream['metadata']:
            md['metadata']['selected'] = True
            metadata.append(md)
        stream['metadata'] = metadata
        streams.append(stream)

    catalog_copy['streams'] = streams

    return catalog_copy


def count_records(
    config: Dict,
    source_uuid: str,
    streams: List[str],
    catalog: Dict = None,
    catalog_file_path: str = None,
) -> List[Dict]:
    arr = []

    for stream in streams:
        args = [
            PYTHON_COMMAND,
            source_module_file_path(source_uuid),
            '--config_json',
            json.dumps(config),
            '--selected_streams_json',
            json.dumps([stream]),
            '--count_records',
        ]

        if catalog:
            args += [
                '--catalog_json',
                json.dumps(catalog),
            ]
        elif catalog_file_path:
            args += [
                '--catalog',
                catalog_file_path,
            ]

        arr += json.loads(__run_in_subprocess(args, config=config))

    return arr


def __run_in_subprocess(run_args: List[str], config: Dict = None) -> str:
    try:
        proc = subprocess.run(run_args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        proc.check_returncode()

        return parse_logs_and_json(
            proc.stdout.decode(),
            config=config,
        )
    except subprocess.CalledProcessError as e:
        message = e.stderr.decode('utf-8')
        raise Exception(filter_out_config_values(message, config))
