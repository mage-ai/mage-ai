import importlib
import json
import os
import subprocess
from logging import Logger
from typing import Any, Dict, List, Tuple, Union

import pandas as pd
import simplejson
import yaml

from mage_ai.data_integrations.logger.utils import (
    print_log_from_line,
    print_logs_from_output,
)
from mage_ai.data_integrations.utils.config import get_batch_fetch_limit
from mage_ai.data_integrations.utils.parsers import parse_logs_and_json
from mage_ai.data_preparation.models.block.data_integration.constants import (
    EXECUTION_PARTITION_FROM_NOTEBOOK,
    KEY_BOOKMARK_PROPERTIES,
    KEY_DESTINATION_TABLE,
    KEY_DISABLE_COLUMN_TYPE_CHECK,
    KEY_KEY_PROPERTIES,
    KEY_METADATA,
    KEY_PARTITION_KEYS,
    KEY_PROPERTIES,
    KEY_RECORD,
    KEY_REPLICATION_METHOD,
    KEY_SCHEMA,
    KEY_STREAM,
    KEY_TABLE,
    KEY_TYPE,
    KEY_UNIQUE_CONFLICT_METHOD,
    KEY_UNIQUE_CONSTRAINTS,
    KEY_VALUE,
    MAX_QUERY_STRING_SIZE,
    OUTPUT_TYPE_RECORD,
    OUTPUT_TYPE_SCHEMA,
    OUTPUT_TYPE_STATE,
    REPLICATION_METHOD_INCREMENTAL,
    STATE_FILENAME,
    VARIABLE_BOOKMARK_VALUES_KEY,
    IngestMode,
)
from mage_ai.data_preparation.models.block.data_integration.data import (
    convert_dataframe_to_output,
)
from mage_ai.data_preparation.models.block.data_integration.schema import build_schema
from mage_ai.data_preparation.models.constants import (
    PYTHON_COMMAND,
    BlockLanguage,
    BlockType,
)
from mage_ai.data_preparation.models.pipelines.utils import number_string
from mage_ai.shared.array import find
from mage_ai.shared.files import reverse_readline
from mage_ai.shared.hash import dig, extract, merge_dict
from mage_ai.shared.parsers import encode_complex, extract_json_objects
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


def variable_directory(data_integration_uuid: str, stream: str = None) -> str:
    arr = [data_integration_uuid]
    if stream:
        arr.append(clean_name(stream))
    return os.path.join(*arr)


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
        lambda x: x.get('tap_stream_id') in streams or x.get('stream') in streams,
        catalog.get('streams', []),
    ))


def get_metadata_from_stream(stream: Dict) -> Dict:
    md = stream.get('metadata', [])
    return find(
        lambda x: len(x.get('breadcrumb') or []) == 0,
        md,
    )


def update_metadata_in_stream(stream: Dict, metadata_payload: Dict) -> Dict:
    stream_use = stream.copy()

    metadata = (get_metadata_from_stream(stream_use) or {}).copy()
    if metadata:
        md1 = metadata.get('metadata') or {}
        metadata['metadata'] = merge_dict(
            md1,
            metadata_payload,
        )
        md_index = None
        for idx, md in enumerate(stream_use.get('metadata') or []):
            if len(md.get('breadcrumb') or []) == 0:
                md_index = idx
                break

        stream_use['metadata'][md_index] = metadata

    return stream_use


def get_selected_streams(catalog: Dict) -> List[Dict]:
    streams = []

    if catalog:
        for stream in catalog.get('streams', []):
            md_find = get_metadata_from_stream(stream)

            if not md_find or md_find.get('metadata', {}).get('selected'):
                streams.append(stream)

    return streams


def build_variable(
    block,
    data_integration_uuid: str = None,
    execution_partition: str = None,
    from_notebook: bool = False,
    stream: str = None,
):
    # The output file nested in the variables directory must contain the stream and the index
    # because a single block can have multiple streams with multiple indexes each due to fan out.
    if from_notebook:
        partition = EXECUTION_PARTITION_FROM_NOTEBOOK
    else:
        partition = execution_partition

    if data_integration_uuid:
        variable_uuid = variable_directory(data_integration_uuid, stream)
    else:
        variable_uuid = ''

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
        data_integration_uuid=data_integration_uuid,
        execution_partition=execution_partition,
        from_notebook=from_notebook,
        stream=stream,
    )

    filename = output_filename(index) if index is not None else None
    # Example:
    # /root/.mage_data/default_repo/pipelines/unified_pipeline/.variables
    # /_from_notebook/source_postgresql/postgresql/user_with_emails
    return variable_use.full_path(filename)


def get_streams_from_output_directory(
    block,
    data_integration_uuid: str = None,
    execution_partition: str = None,
    from_notebook: bool = False,
) -> Dict:
    variable = build_variable(
        block,
        data_integration_uuid=data_integration_uuid,
        execution_partition=execution_partition,
        from_notebook=from_notebook,
        stream=None,
    )
    # /root/.mage_data/default_repo/pipelines/unified_pipeline/.variables
    # /_from_notebook/source_postgresql/postgresql
    # or
    # /root/.mage_data/default_repo/pipelines/unified_pipeline/.variables
    # /_from_notebook/source_postgresql
    output_directory_path = output_full_path(
        data_integration_uuid=data_integration_uuid,
        variable=variable,
    )

    mapping = {}
    if os.path.exists(output_directory_path):
        # dir_name could be the stream if data_integration_uuid is not None
        for dir_name1 in os.listdir(output_directory_path):
            if data_integration_uuid:
                mapping[dir_name1] = []
            # ../[block_uuid]/[data_integration_uuid]/[stream]
            # or
            # ../[block_uuid]/[data_integration_uuid]
            dir_full_path1 = os.path.join(output_directory_path, dir_name1)
            if os.path.isdir(dir_full_path1):
                for dir_name2 in os.listdir(dir_full_path1):
                    if not data_integration_uuid:
                        mapping[dir_name2] = []
                    # ../[block_uuid]/[data_integration_uuid]/[stream]/00000000000000000000
                    # or
                    # ../[block_uuid]/[data_integration_uuid]/[stream]
                    dir_full_path2 = os.path.join(dir_full_path1, dir_name2)
                    if data_integration_uuid:
                        mapping[dir_name1].append(dir_full_path2)
                    elif os.path.isdir(dir_full_path2):
                        for dir_name3 in os.listdir(dir_full_path2):
                            dir_full_path3 = os.path.join(dir_full_path2, dir_name3)
                            mapping[dir_name2].append(dir_full_path3)

    return mapping


def get_state_data(
    block,
    catalog: Dict,
    from_notebook: bool = False,
    index: int = None,
    partition: str = None,
    data_integration_uuid: str = None,
    include_record: bool = False,
    stream_id: str = None,
) -> Union[Dict, Tuple[Dict, Dict]]:
    output_file_paths = get_output_file_paths(
        block,
        catalog,
        from_notebook=from_notebook,
        index=index,
        partition=partition,
        data_integration_uuid=data_integration_uuid,
        stream_id=stream_id,
    )

    output_file_paths.sort()

    record = None
    state_data = None

    if output_file_paths:
        output_file_path = output_file_paths[-1]

        if not os.path.exists(output_file_path):
            return None

        for line in reverse_readline(output_file_path):
            if line:
                try:
                    row = json.loads(line)
                    row_type = row.get(KEY_TYPE)

                    if include_record and \
                            OUTPUT_TYPE_RECORD == row_type and \
                            KEY_RECORD in row and \
                            (not stream_id or stream_id == row.get(KEY_STREAM)):

                        record = row[KEY_RECORD]
                    elif OUTPUT_TYPE_STATE == row_type and KEY_VALUE in row:
                        # If it finds a state again even before it find a record, break.
                        if state_data is not None:
                            break

                        state_data = row[KEY_VALUE]

                        if not include_record or record:
                            break
                except json.JSONDecodeError:
                    pass

        if include_record:
            return state_data, record

        return state_data


def execute_data_integration(
    block,
    outputs_from_input_vars,
    custom_code: str = None,
    data_integration_runtime_settings: Dict = None,
    dynamic_block_index: int = None,
    dynamic_upstream_block_uuids: List[str] = None,
    execution_partition: str = None,
    execution_partition_previous: str = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    input_from_output: Dict = None,
    input_vars: List = None,
    logger: Logger = None,
    logging_tags: Dict = None,
    run_settings: Dict = None,
    runtime_arguments: Dict = None,
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
    config_json = simplejson.dumps(
        config,
        default=encode_complex,
        ignore_nan=True,
    )
    query = data_integration_settings.get('query')

    data_integration_uuid = data_integration_settings.get('data_integration_uuid')

    runtime_settings = run_settings or block.template_runtime_configuration or {}
    index = runtime_settings.get('index', 0)
    is_last_block_run = runtime_settings.get('is_last_block_run', False)
    selected_streams = runtime_settings.get('selected_streams', [])

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
            selected_streams = [s.get('tap_stream_id') for s in get_selected_streams(catalog)]

        stream = selected_streams[0] if len(selected_streams) >= 1 else None
        # destination_table = self.template_runtime_configuration.get('destination_table', stream)
        query_data = merge_dict(runtime_arguments, query) or {}

        if not stream:
            return []

        # Handle incremental sync
        state_data = None
        if index is not None:
            batch_fetch_limit = get_batch_fetch_limit(config)
            stream_catalogs = get_streams_from_catalog(catalog, [stream]) or []

            if len(stream_catalogs) == 1 and \
                    REPLICATION_METHOD_INCREMENTAL == stream_catalogs[0].get('replication_method'):

                if global_vars_more and VARIABLE_BOOKMARK_VALUES_KEY in global_vars_more:
                    bookmark_values_by_block_uuid = global_vars_more.get(
                        VARIABLE_BOOKMARK_VALUES_KEY,
                    ) or {}

                    if bookmark_values_by_block_uuid.get(block.uuid):
                        state_data = dict(
                            bookmarks=bookmark_values_by_block_uuid.get(block.uuid),
                        )

                if not state_data and execution_partition_previous:
                    state_data = get_state_data(
                        block,
                        catalog,
                        data_integration_uuid=data_integration_uuid,
                        from_notebook=from_notebook,
                        index=index,
                        partition=execution_partition_previous,
                        stream_id=stream,
                    )
            else:
                query_data['_offset'] = batch_fetch_limit * index

            if not is_last_block_run:
                query_data['_limit'] = batch_fetch_limit

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
            simplejson.dumps(
                query_data,
                default=encode_complex,
                ignore_nan=True,
            ),
        ]

        if BlockLanguage.PYTHON == block.language:
            args += [
                '--catalog_json',
                simplejson.dumps(
                    catalog,
                    default=encode_complex,
                    ignore_nan=True,
                ),
            ]
        else:
            args += [
                '--catalog',
                block.get_catalog_file_path(),
            ]

        if state_data:
            args += [
                '--state_json',
                simplejson.dumps(
                    state_data,
                    default=encode_complex,
                    ignore_nan=True,
                ),
            ]

        if len(selected_streams) >= 1:
            args += [
                '--selected_streams_json',
                simplejson.dumps(
                    selected_streams,
                    default=encode_complex,
                    ignore_nan=True,
                ),
            ]

        proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

        variable = build_variable(
            block,
            data_integration_uuid=data_integration_uuid,
            execution_partition=execution_partition,
            from_notebook=from_notebook,
            stream=stream,
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
        proc = __execute_destination(
            block,
            data_integration_settings,
            module_file_path,
            dynamic_block_index=dynamic_block_index,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            from_notebook=from_notebook,
            global_vars=global_vars_more,
            input_vars=input_vars,
            logger=logger,
            logging_tags=logging_tags,
            partition=execution_partition,
            run_settings=run_settings,
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


def convert_block_output_data_for_destination(
    block,
    data_integration_uuid: str,
    stream: str,
    chunk_size: float = None,
    dynamic_block_index: Union[int, None] = None,
    dynamic_upstream_block_uuids: Union[List[str], None] = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    logger: Logger = None,
    logging_tags: Dict = None,
    partition: str = None,
) -> Tuple[List[str], Dict]:
    variable = build_variable(
        block,
        data_integration_uuid=data_integration_uuid,
        execution_partition=partition,
        from_notebook=from_notebook,
        stream=stream,
    )
    output_dir_path = output_full_path(
        data_integration_uuid=data_integration_uuid,
        variable=variable,
    )

    # If not source, get the output data from upstream block,
    # then convert it to Singer Spec format.

    input_vars_fetched, _kwargs_vars, upstream_block_uuids = \
        block.fetch_input_variables(
            None,
            dynamic_block_index=dynamic_block_index,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            execution_partition=partition,
            from_notebook=from_notebook,
            global_vars=global_vars,
            upstream_block_uuids=[stream],
        )

    data = input_vars_fetched[0] if input_vars_fetched else None

    if data is None:
        msg = f'No data for stream {stream}.',
        if logger:
            logger.info(msg, **logging_tags)
        else:
            print(msg)

        return

    os.makedirs(os.path.dirname(output_dir_path), exist_ok=True)

    if isinstance(data, pd.DataFrame):
        # Build catalog at and merge upstream source catalog with destination catalog.
        # No schema provided from upstream block (that isn’t a source block)
        # or configured in destination block:
        # Dynamically build schema if no stream setting for schema in catalog.

        # We’re hardcoding the replication method for now until we fetch the catalog
        # from the upstream block.
        schema = build_schema(data, stream)

        logger.info(
            f'Writing {len(data.index)} records from stream {stream} to directory '
            f'{output_dir_path}.',
            **logging_tags,
        )

        # Break up the output file into chunks based on data frame size: ~10mb chunks.

        output_files_paths = convert_dataframe_to_output(
            data,
            stream,
            chunk_size=chunk_size,
            dir_path=output_dir_path,
            log_message=lambda msg, logger=logger, logging_tags=logging_tags: logger.info(
                msg,
                **logging_tags,
            ),
            schema=schema,
        )

        return output_files_paths, schema


def __execute_destination(
    block,
    data_integration_settings: Dict,
    module_file_path: str,
    dynamic_block_index: int = None,
    dynamic_upstream_block_uuids: List[str] = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    input_vars: List = None,
    logger: Logger = None,
    logging_tags: Dict = None,
    partition: str = None,
    run_settings: Dict = None,
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
    config = data_integration_settings.get('config') or {}

    data_integration_uuid = data_integration_settings.get('data_integration_uuid')

    runtime_settings = run_settings or block.template_runtime_configuration or {}
    index = runtime_settings.get('index', 0)
    selected_streams_init = runtime_settings.get('selected_streams', [])
    selected_streams = selected_streams_init

    configuration_data_integration = block.configuration_data_integration
    # TESTING PURPOSES ONLY
    if not selected_streams:
        inputs_only = block.inputs_only_uuids
        uuids = [i for i in block.upstream_block_uuids if i not in inputs_only]
        if uuids:
            selected_streams = uuids

    stream = None
    if selected_streams:
        stream = selected_streams[0] if len(selected_streams) >= 1 else None

    if not stream:
        logger.info('No stream selected, skipping execution.')
        return

    # The parent_stream is typically the upstream source block UUID. However,
    # in case the upstream source block is dynamic, we’ll use the parent_stream
    # value which will be the block run’s block UUID, which contains extra information
    # in the UUID (e.g. [block_uuid]:[index]).
    parent_stream = runtime_settings.get('parent_stream')

    # Check to see if the stream (aka block UUID) is a source block or a normal block
    if parent_stream:
        block_stream = block.pipeline.get_block(parent_stream)
    else:
        block_stream = block.pipeline.get_block(stream)

    block_stream_is_source = block_stream.is_source()
    block_stream_data_integration_settings = None
    catalog_from_source = None

    if block_stream_is_source:
        block_stream_data_integration_settings = block_stream.get_data_integration_settings(
            dynamic_block_index=dynamic_block_index,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            from_notebook=from_notebook,
            global_vars=global_vars,
            input_vars=input_vars,
            partition=partition,
            **kwargs,
        )
        if not parent_stream:
            parent_stream = block_stream.uuid

        catalog_from_source = block_stream_data_integration_settings.get('catalog')

        # TESTING PURPOSES ONLY
        if not selected_streams_init and catalog_from_source:
            selected_streams = \
                [s.get('tap_stream_id') for s in get_selected_streams(catalog_from_source)]
            stream = selected_streams[0] if len(selected_streams) >= 1 else None

    ingest_mode = IngestMode.DISK
    if configuration_data_integration.get('ingest_mode'):
        if configuration_data_integration.get('ingest_mode').get(stream):
            ingest_mode = configuration_data_integration.get('ingest_mode').get(stream)

    tags = merge_dict(logging_tags, dict(block_tags=dict(
        index=index,
        ingest_mode=ingest_mode,
        parent_stream=parent_stream,
        stream=stream,
        type=block.type,
        uuid=block.uuid,
    )))

    output_file_path = None

    if IngestMode.DISK == ingest_mode:
        block_for_variable = None
        data_integration_uuid_for_variable = None

        # If source, then just pass the output file to the destination to read from.
        if block_stream_is_source:
            block_for_variable = block_stream
            data_integration_uuid_for_variable = block_stream_data_integration_settings.get(
                'data_integration_uuid',
            )
        elif from_notebook:
            # Convert if running block from notebook.
            # If block is running from scheduler, the conversion happens at the
            # child controller block run for a stream.
            output_file_paths, schema_from_source = convert_block_output_data_for_destination(
                block,
                chunk_size=MAX_QUERY_STRING_SIZE,
                data_integration_uuid=data_integration_uuid,
                dynamic_block_index=dynamic_block_index,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                from_notebook=from_notebook,
                logger=logger,
                logging_tags=logging_tags,
                partition=partition,
                stream=stream,
            )

            if output_file_paths:
                output_file_path = output_file_paths[0]
            if schema_from_source:
                catalog_from_source = dict(streams=[schema_from_source])
        else:
            block_for_variable = block
            data_integration_uuid_for_variable = data_integration_uuid

        if block_for_variable and data_integration_uuid_for_variable:
            variable = build_variable(
                block_for_variable,
                data_integration_uuid=data_integration_uuid_for_variable,
                execution_partition=partition,
                from_notebook=from_notebook,
                stream=stream,

            )
            output_file_path = output_full_path(
                index=index,
                data_integration_uuid=data_integration_uuid_for_variable,
                variable=variable,
            )
    elif IngestMode.MEMORY == ingest_mode:
        print(f'[TODO] Ingesting using memory for {stream}')
        return

    if output_file_path:
        file_size = os.path.getsize(output_file_path)
        msg = f'Reading {file_size} bytes from {output_file_path} as input file.'
        if logger:
            logger.info(msg, **logging_tags)
        else:
            print(msg)

        # Get the schema from the upstream block if the upstream block isn’t
        if not catalog_from_source:
            with open(output_file_path, 'r') as f:
                for line in f:
                    row = json.loads(line)
                    if row and OUTPUT_TYPE_SCHEMA == row.get(KEY_TYPE):
                        catalog_from_source = dict(streams=[row])
                        break

    # Refer to destination table value in the stream’s schema settings
    if not from_notebook or KEY_TABLE not in config:
        config[KEY_TABLE] = stream

    args = [
        PYTHON_COMMAND,
        module_file_path,
        '--log_to_stdout',
        '1',
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
    else:
        raise Exception(
            f'No input file path exists for {data_integration_uuid} '
            f'in stream {stream} and batch {index}.',
        )

    if catalog or catalog_from_source:
        stream_settings = None
        stream_settings_source = None
        if catalog:
            stream_dicts = get_streams_from_catalog(catalog, [stream])
            if stream_dicts:
                # If there is a stream in the data integration catalog that that matches
                # more than 1 stream from an upstream block,
                # then the destination block’s catalog stream settings must contain
                # a key for parent_stream.
                if len(stream_dicts) >= 2 and parent_stream:
                    stream_dicts_for_parent_stream = find(
                        lambda x, ps=parent_stream: x.get('parent_stream') == ps,
                        stream_dicts,
                    )
                    if stream_dicts_for_parent_stream:
                        stream_settings = stream_dicts_for_parent_stream
                else:
                    stream_settings = stream_dicts[0]

        if catalog_from_source:
            stream_dicts = get_streams_from_catalog(catalog_from_source, [stream])
            if stream_dicts:
                stream_settings_source = stream_dicts[0]

        keys_to_override = [
            KEY_BOOKMARK_PROPERTIES,
            KEY_DESTINATION_TABLE,
            KEY_DISABLE_COLUMN_TYPE_CHECK,
            KEY_KEY_PROPERTIES,
            KEY_PARTITION_KEYS,
            KEY_REPLICATION_METHOD,
            KEY_UNIQUE_CONFLICT_METHOD,
            KEY_UNIQUE_CONSTRAINTS,
            KEY_STREAM,
        ]

        # Merge destination schema with upstream catalog schema.
        # Add parent stream for upstream block sources
        stream_settings_final = merge_dict(
            extract(stream_settings_source or {}, keys_to_override),
            extract(stream_settings or {}, keys_to_override),
        )

        if KEY_DESTINATION_TABLE in stream_settings_final:
            config[KEY_TABLE] = stream_settings_final.get(KEY_DESTINATION_TABLE)

        schema_final = {}
        schema_properties = {}

        for stream_settings_inner in [
            stream_settings_source,
            stream_settings,
        ]:
            if not stream_settings_inner:
                continue

            schema_dict = stream_settings_inner.get(KEY_SCHEMA)
            schema_final.update(extract(schema_dict or {}, [KEY_TYPE]))

            if schema_dict and schema_dict.get(KEY_PROPERTIES):
                schema_properties = __select_selected_columns(stream_settings_inner, schema_dict)

        catalog_final = dict(streams=[
            merge_dict(
                stream_settings_final,
                dict(
                    schema=merge_dict(
                        schema_final,
                        {
                            KEY_PROPERTIES: schema_properties,
                        },
                    ),
                ),
            ),
        ])

        args += [
            '--catalog_json',
            simplejson.dumps(
                catalog_final,
                default=encode_complex,
                ignore_nan=True,
            ),
        ]

    # This needs to go last because we add the table name at the end.
    args += [
        '--config_json',
        simplejson.dumps(
            config,
            default=encode_complex,
            ignore_nan=True,
        ),
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


def get_output_file_paths(
    block,
    catalog: Dict,
    from_notebook: bool = False,
    index: int = None,
    partition: str = None,
    data_integration_uuid: str = None,
    stream_id: str = None,
) -> List[str]:
    variable = build_variable(
        block,
        data_integration_uuid=data_integration_uuid,
        execution_partition=partition,
        from_notebook=from_notebook,
        stream=stream_id,
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

    return output_file_paths


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
    output_file_paths = get_output_file_paths(
        block,
        catalog,
        from_notebook=from_notebook,
        index=index,
        partition=partition,
        data_integration_uuid=data_integration_uuid,
        stream_id=stream_id,
    )

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
            if os.path.exists(output_file_path):
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
        simplejson.dumps(
            config,
            default=encode_complex,
            ignore_nan=True,
        ),
        '--discover',
    ]

    if streams:
        run_args += [
            '--selected_streams_json',
            simplejson.dumps(
                streams,
                default=encode_complex,
                ignore_nan=True,
            ),
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
                simplejson.dumps(
                    config,
                    default=encode_complex,
                    ignore_nan=True,
                ),
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
    block=None,
    catalog: Dict = None,
    catalog_file_path: str = None,
    from_notebook: bool = False,
    partition: str = None,
    variables: Dict = None,
) -> List[Dict]:
    arr = []

    for stream in streams:
        args = [
            PYTHON_COMMAND,
            source_module_file_path(source_uuid),
            '--config_json',
            simplejson.dumps(
                config,
                default=encode_complex,
                ignore_nan=True,
            ),
            '--selected_streams_json',
            simplejson.dumps(
                [stream],
                default=encode_complex,
                ignore_nan=True,
            ),
            '--count_records',
        ]

        if catalog:
            args += [
                '--catalog_json',
                simplejson.dumps(
                    catalog,
                    default=encode_complex,
                    ignore_nan=True,
                ),
            ]
        elif catalog_file_path:
            args += [
                '--catalog',
                catalog_file_path,
            ]

        state_data = None
        # Make sure replication method is INCREMENTAL
        if block:
            stream_dicts = catalog.get('streams')
            if stream_dicts:
                stream_dict = find(lambda x, stream=stream: x['stream'] == stream, stream_dicts)
                if not stream_dict:
                    raise Exception(
                        f'No stream settings found for stream {stream} in source {source_uuid}, '
                        'this is unexpected.',
                    )

                if stream_dict and \
                        REPLICATION_METHOD_INCREMENTAL == stream_dict.get(KEY_REPLICATION_METHOD):

                    if variables and VARIABLE_BOOKMARK_VALUES_KEY in variables:
                        bookmark_values_by_block_uuid = variables.get(
                            VARIABLE_BOOKMARK_VALUES_KEY,
                        ) or {}

                        if bookmark_values_by_block_uuid.get(block.uuid):
                            state_data = dict(
                                bookmarks=bookmark_values_by_block_uuid.get(block.uuid),
                            )

                    if not state_data:
                        state_data = get_state_data(
                            block,
                            catalog,
                            data_integration_uuid=source_uuid,
                            from_notebook=from_notebook,
                            partition=partition,
                            stream_id=stream,
                        )

        if state_data:
            args += [
                '--state_json',
                simplejson.dumps(
                    state_data,
                    default=encode_complex,
                    ignore_nan=True,
                ),
            ]

        arr += json.loads(__run_in_subprocess(args, config=config))

    return arr


def test_connection(block) -> None:
    data_integration_settings = block.get_data_integration_settings(
        from_notebook=True,
        global_vars=block.pipeline.variables if block.pipeline else None,
    )

    config = data_integration_settings.get('config')
    data_integration_uuid = data_integration_settings.get('data_integration_uuid')

    is_source = block.is_source()

    module_file_path = None
    if is_source:
        module_file_path = source_module_file_path(data_integration_uuid)
    else:
        module_file_path = destination_module_file_path(data_integration_uuid)

    try:
        if module_file_path:
            run_args = [
                PYTHON_COMMAND,
                module_file_path,
                '--config_json',
                simplejson.dumps(
                    config,
                    default=encode_complex,
                    ignore_nan=True,
                ),
                '--test_connection',
            ]

            proc = subprocess.run(
                run_args,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=10,
            )
            proc.check_returncode()
    except subprocess.CalledProcessError as err:
        stderr = err.stderr.decode('utf-8')

        json_object = {}
        error = stderr
        for line in stderr.split('\n'):
            if line.startswith('ERROR'):
                try:
                    json_object = next(extract_json_objects(line))
                    error = dig(json_object, 'tags.error')
                except Exception:
                    error = line
            elif not error and line.startswith('CRITICAL'):
                error = line
        raise Exception(filter_out_config_values(error, config))
    except Exception as err:
        raise Exception(filter_out_config_values(str(err), config))


def fetch_data(
    block,
    partition: str = None,
    selected_streams: List[Dict] = None,
    sample_count: int = None,
) -> Dict:
    if not selected_streams:
        return

    if block.is_source():
        return __fetch_data_from_source_block(block, selected_streams=selected_streams)

    outputs = {}

    # If the block is a destination block, it doesn’t produce any data so it must read
    # the data from an upstream block by executing it.
    for stream in selected_streams:
        parent_stream = stream.get('parent_stream')
        stream_id = stream.get('stream')
        if not parent_stream:
            continue

        upstream_block = block.pipeline.get_block(parent_stream)

        if not upstream_block:
            continue

        if upstream_block.is_source():
            outputs.update(
                __fetch_data_from_source_block(
                    upstream_block,
                    selected_streams=[stream],
                ),
            )
        else:
            block_output = upstream_block.execute_sync(
                execution_partition=partition,
                from_notebook=False if sample_count is None else True,
                global_vars=block.pipeline.variables if block.pipeline else None,
                store_variables=False,
            )
            if block_output.get('output'):
                output = block_output.get('output')
                if isinstance(output, Dict) and output.get(stream_id):
                    outputs[stream_id] = output.get(stream_id)
                else:
                    outputs[stream_id] = output
            else:
                outputs[stream_id] = block_output

    return outputs


def __fetch_data_from_source_block(
    block,
    selected_streams: List[Dict] = None,
) -> Dict:
    data_integration_settings = block.get_data_integration_settings(
        from_notebook=True,
        global_vars=block.pipeline.variables if block.pipeline else None,
    )

    config = data_integration_settings.get('config')
    data_integration_uuid = data_integration_settings.get('data_integration_uuid')

    is_source = block.is_source()

    module_file_path = None
    if is_source:
        module_file_path = source_module_file_path(data_integration_uuid)
    else:
        module_file_path = destination_module_file_path(data_integration_uuid)

    stream_ids = [d.get('stream') for d in selected_streams]

    if not module_file_path:
        return

    outputs = {}

    try:
        run_args = [
            PYTHON_COMMAND,
            module_file_path,
            '--config_json',
            simplejson.dumps(
                config,
                default=encode_complex,
                ignore_nan=True,
            ),
            '--load_sample_data',
            '--log_to_stdout',
            '1',
            '--catalog',
            block.get_catalog_file_path(),
            '--selected_streams_json',
            json.dumps(stream_ids),
        ]

        proc = subprocess.run(
            run_args,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        proc.check_returncode()

        output = proc.stdout.decode()
        print_logs_from_output(output, config=config)

        for line in output.split('\n'):
            try:
                from mage_integrations.utils.logger.constants import TYPE_SAMPLE_DATA

                data = json.loads(line)
                if TYPE_SAMPLE_DATA == data.get('type'):
                    sample_data_json = data.get('sample_data')
                    stream_id = data.get('stream_id')
                    outputs[stream_id] = pd.DataFrame.from_dict(json.loads(sample_data_json))

            except json.decoder.JSONDecodeError:
                pass
    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode('utf-8').split('\n')

        json_object = {}
        error = ''
        for line in stderr:
            if line.startswith('ERROR'):
                try:
                    json_object = next(extract_json_objects(line))
                    error = dig(json_object, 'tags.error')
                except Exception:
                    error = line
        error = filter_out_config_values(error, config)
        if not error:
            raise Exception('The sample data was not able to be loaded. Please check if the ' +
                            'stream still exists. If it does not, click the "View and select ' +
                            'streams" button and confirm the valid streams. If it does, ' +
                            'loading sample data for this source may not currently ' +
                            'be supported.')
        raise Exception(error)

    return outputs


def read_data_from_cache(
    block,
    stream_id: str,
    parent_stream: str = None,
    partition: str = None,
    sample: bool = True,
    sample_count: int = None,
) -> List[Union[Dict, List, pd.DataFrame]]:
    data = block.get_outputs(
        execution_partition=partition,
        sample=sample,
        sample_count=sample_count,
        selected_variables=[stream_id],
    )

    if data is None and block.is_destination():
        upstream_block = block.pipeline.get_block(parent_stream)

        data = upstream_block.get_outputs(
            execution_partition=partition,
            sample=sample,
            sample_count=sample_count,
            selected_variables=[stream_id],
        )

    return data


def persist_data_for_stream(
    block,
    stream_id: str,
    output: Union[Dict, List, pd.DataFrame],
    partition: str = None,
) -> None:
    block.pipeline.variable_manager.add_variable(
        block.pipeline.uuid,
        block.uuid,
        stream_id,
        output,
        partition=partition,
    )


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


def __select_selected_columns(stream_settings: Dict, schema_dict: Dict) -> Dict:
    properties = (schema_dict.get(KEY_PROPERTIES) or {}).copy()
    metadata = stream_settings.get(KEY_METADATA)

    if metadata:
        for md in metadata:
            breadcrumb = md.get('breadcrumb')
            if not breadcrumb:
                continue

            column = breadcrumb[-1]
            md_dict = md.get('metadata')
            if md_dict and 'selected' in md_dict and not md_dict['selected']:
                properties.pop(column, None)

    return properties
