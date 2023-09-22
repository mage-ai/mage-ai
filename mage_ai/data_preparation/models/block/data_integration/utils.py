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
    IngestMode,
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


def output_filename(index: int) -> str:
    return number_string(index)


def get_state_file_path(block, data_integration_uuid: str, stream: str) -> str:
    # ~/.mage_data/default_repo/pipelines/:pipeline_uuid/:block_uuid/:data_integration_uuid/:stream
    full_path = os.path.join(
        block.pipeline.pipeline_variables_dir,
        block.uuid,
        data_integration_uuid,
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


def destination_module(data_integration_uuid: str) -> Any:
    return importlib.import_module(f'mage_integrations.destinations.{data_integration_uuid}')


def source_module(data_integration_uuid: str) -> Any:
    return importlib.import_module(f'mage_integrations.sources.{data_integration_uuid}')


def destination_module_file_path(data_integration_uuid: str) -> str:
    mod = destination_module(data_integration_uuid)
    try:
        if mod:
            return os.path.abspath(mod.__file__)
    except Exception:
        if data_integration_uuid:
            mod1 = importlib.import_module('mage_integrations.destinations')
            absolute_path = os.path.join(*mod1.__file__.split(os.path.sep)[:-1])
            absolute_path = os.path.join(absolute_path, data_integration_uuid, '__init__.py')

            return absolute_path


def source_module_file_path(data_integration_uuid: str) -> str:
    mod = source_module(data_integration_uuid)
    try:
        if mod:
            return os.path.abspath(mod.__file__)
    except Exception:
        if data_integration_uuid:
            mod1 = importlib.import_module('mage_integrations.sources')
            absolute_path = os.path.join(*mod1.__file__.split(os.path.sep)[:-1])
            absolute_path = os.path.join(absolute_path, data_integration_uuid, '__init__.py')

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
    data_integration_uuid: str,
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

    variable_uuid = variable_directory(data_integration_uuid, stream)
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
    data_integration_uuid: str = None,
    stream: str = None,
    variable=None,
) -> str:
    variable_use = variable or build_variable(
        block,
        data_integration_uuid,
        stream,
        execution_partition=execution_partition,
        from_notebook=from_notebook,
    )

    filename = output_filename(index) if index is not None else None
    # Example:
    # /root/.mage_data/default_repo/pipelines/unified_pipeline/.variables
    # /_from_notebook/source_postgresql/postgresql/user_with_emails
    return variable_use.full_path(filename)


def execute_data_integration(
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

    global_vars_more = merge_dict(global_vars, {
        'pipeline.name': block.pipeline.name if block.pipeline else None,
        'pipeline.uuid': block.pipeline.uuid if block.pipeline else None,
    })

    data_integration_settings = block.get_data_integration_settings(
        dynamic_block_index=dynamic_block_index,
        dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
        from_notebook=from_notebook,
        global_vars=global_vars_more,
        input_vars=input_vars,
        partition=execution_partition,
        **kwargs,
    )

    catalog = data_integration_settings.get('catalog')
    config = data_integration_settings.get('config')
    config_json = json.dumps(config)

    data_integration_uuid = data_integration_settings.get('data_integration_uuid')
    index = block.template_runtime_configuration.get('index', 0)
    is_last_block_run = block.template_runtime_configuration.get('is_last_block_run', False)
    selected_streams = block.template_runtime_configuration.get('selected_streams', [])

    is_source = block.is_source()

    module_file_path = None
    if data_integration_runtime_settings:
        module_file_paths = data_integration_runtime_settings.get('module_file_paths', {})

        key = 'sources' if is_source else 'destinations'
        file_paths = module_file_paths.get(key) or {}
        module_file_path = file_paths.get(data_integration_uuid)

    if not module_file_path:
        if is_source:
            module_file_path = source_module_file_path(data_integration_uuid)
        else:
            module_file_path = destination_module_file_path(data_integration_uuid)

    output_file_path = None
    outputs = []
    proc = None

    if is_source:
        if not selected_streams:
            selected_streams = data_integration_settings.get('selected_streams')

        # TESTING PURPOSES ONLY
        if not selected_streams and catalog:
            selected_streams = [s.get('tap_stream_id') for s in catalog.get('streams', [])]

        stream = selected_streams[0] if len(selected_streams) >= 1 else None
        # destination_table = self.template_runtime_configuration.get('destination_table', stream)
        query_data = (runtime_arguments or {}).copy()

        if not stream:
            return []

        # Handle incremental sync
        state_file_path = None
        if index is not None:
            state_file_path = get_state_file_path(block, data_integration_uuid, stream)

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

        tags = dict(block_tags=dict(
            index=index,
            stream=stream,
            type=block.type,
            uuid=block.uuid,
        ))

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

        if state_file_path:
            args += [
                '--state',
                state_file_path,
            ]

        if len(selected_streams) >= 1:
            args += [
                '--selected_streams_json',
                json.dumps(selected_streams),
            ]

        proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

        variable = build_variable(
            block,
            data_integration_uuid,
            stream,
            execution_partition=execution_partition,
            from_notebook=from_notebook,
        )
        output_file_path = output_full_path(
            index=index,
            data_integration_uuid=data_integration_uuid,
            variable=variable,
        )

        lines_in_file = 0
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
    else:
        ingest_mode = None
        if block.configuration_data_integration.get('ingest_mode'):
            ingest_mode = block.configuration_data_integration.get('ingest_mode').get(stream)

        proc = __execute_destination(
            block,
            stream,
            data_integration_settings,
            module_file_path,
            dynamic_block_index=dynamic_block_index,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            from_notebook=from_notebook,
            global_vars=global_vars_more,
            ingest_mode=ingest_mode,
            input_vars=input_vars,
            logger=logger,
            logging_tags=logging_tags,
            partition=execution_partition,
        )

    if proc:
        proc.communicate()
        if proc.returncode != 0 and proc.returncode is not None:
            cmd = proc.args if isinstance(proc.args, str) else str(proc.args)
            raise subprocess.CalledProcessError(
                proc.returncode,
                filter_out_config_values(cmd, config),
            )

    if is_source:
        if output_file_path and os.path.exists(output_file_path):
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
                    data_integration_uuid=data_integration_uuid,
                    stream_id=stream,
                )

                return [
                    pd.DataFrame(
                        d['rows'],
                        columns=d['columns'],
                    ),
                ]

    return outputs


def __execute_destination(
    block,
    stream: str,
    data_integration_settings: Dict,
    module_file_path: str,
    dynamic_block_index: int = None,
    dynamic_upstream_block_uuids: List[str] = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    ingest_mode: IngestMode = None,
    input_vars: List = None,
    logger: Logger = None,
    logging_tags: Dict = None,
    partition: str = None,
    **kwargs,
) -> List:
    # Parameters

    # stream: this is typically the name of the upstream block UUID or
    #   the name of 1 of the streams from an upstream source block.
    #   However, if the upstream block is a source with multiple streams,
    #   then use the catalog stream settings key "parent_stream" to
    #   select the matching stream settings.

    # 2 modes:
    # Ingest data from disk
    # 1. Incrementally load data in memory by reading data from disk
    # 2. Convert to Singer Spec in memory
    # 3. Write to disk
    # 4. Tell destination where file is to ingest data

    # Ingest data in memory
    # 1. Incrementally load data in memory by reading data from disk
    # 2. Convert to Singer Spec in memory
    # 3. Pipe Singer Spec text from memory into running destination process

    catalog = data_integration_settings.get('catalog')
    config = data_integration_settings.get('config')
    config_json = json.dumps(config)

    data_integration_uuid = data_integration_settings.get('data_integration_uuid')
    index = block.template_runtime_configuration.get('index', 0)
    selected_streams = block.template_runtime_configuration.get('selected_streams', [])
    # The parent_stream is typically the upstream source block UUID. However,
    # in case the upstream source block is dynamic, we’ll use the parent_stream
    # value which will be the block run’s block UUID, which contains extra information
    # in the UUID (e.g. [block_uuid]:[index]).
    parent_stream = block.template_runtime_configuration.get('parent_stream', [])

    # Check to see if the stream (aka block UUID) is a source block or a normal block
    block_stream = block.pipeline.get_block(stream)
    block_stream_is_source = block_stream.is_source()

    stream_use = stream
    if block_stream_is_source:
        stream_use = selected_streams[0] if len(selected_streams) >= 1 else None

    tags = merge_dict(logging_tags, dict(block_tags=dict(
        index=index,
        parent_stream=parent_stream,
        stream=stream_use,
        type=block.type,
        uuid=block.uuid,
    )))

    output_file_path = None
    mode = ingest_mode or IngestMode.DISK
    if IngestMode.DISK == mode:
        if block_stream_is_source:
            di_settings = block_stream.get_data_integration_settings(
                dynamic_block_index=dynamic_block_index,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                from_notebook=from_notebook,
                global_vars=global_vars,
                input_vars=input_vars,
                partition=partition,
                **kwargs,
            )

            di_uuid = di_settings.get('data_integration_uuid')

            variable = build_variable(
                block_stream,
                di_uuid,
                stream_use,
                execution_partition=partition,
                from_notebook=from_notebook,
            )
            output_file_path = output_full_path(
                index=index,
                data_integration_uuid=di_uuid,
                variable=variable,
            )
        else:
            input_vars_fetched, _kwargs_vars, _upstream_block_uuids = \
                block.fetch_input_variables(
                    input_vars,
                    partition,
                    global_vars,
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    from_notebook=from_notebook,
                    upstream_block_uuids=[stream],
                )
            # Convert DataFrame to Singer Spec
    elif IngestMode.memory == mode:
        pass

    if output_file_path:
        file_size = os.path.getsize(output_file_path)
        msg = f'Reading {file_size} bytes from {output_file_path} as input file.'
        if logger:
            logger.info(msg, **logging_tags)
        else:
            print(msg)

    args = [
        PYTHON_COMMAND,
        module_file_path,
        '--config_json',
        config_json,
        '--log_to_stdout',
        '1',
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

    if index is not None:
        state_file_path = get_state_file_path(block, data_integration_uuid, stream)
        if state_file_path:
            args += [
                '--state',
                state_file_path,
            ]

    if output_file_path:
        args += [
            '--input_file_path',
            output_file_path,
        ]

    proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

    for line in proc.stdout:
        print_log_from_line(
            line,
            config=config,
            logger=logger,
            logging_tags=logging_tags,
            tags=tags,
        )

    return proc


def convert_outputs_to_data(
    block,
    catalog: Dict,
    from_notebook: bool = False,
    index: int = None,
    partition: str = None,
    data_integration_uuid: str = None,
    stream_id: str = None,
    sample_count: int = None,
) -> Dict:
    variable = build_variable(
        block,
        data_integration_uuid,
        stream_id,
        execution_partition=partition,
        from_notebook=from_notebook,
    )

    output_file_paths = []

    output_file_path = output_full_path(
        index=index,
        data_integration_uuid=data_integration_uuid,
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
