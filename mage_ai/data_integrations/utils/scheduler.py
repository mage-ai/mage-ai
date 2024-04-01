import json
import math
import os
import shutil
from typing import Dict, List, Union

from mage_ai.data_integrations.sources.constants import SQL_SOURCES
from mage_ai.data_integrations.utils.config import build_config, get_batch_fetch_limit
from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.models.block.data_integration.constants import (
    KEY_REPLICATION_METHOD,
    MAX_QUERY_STRING_SIZE,
    REPLICATION_METHOD_INCREMENTAL,
)
from mage_ai.data_preparation.models.block.data_integration.utils import (
    convert_block_output_data_for_destination,
    count_records,
    get_selected_streams,
    get_streams_from_output_directory,
)
from mage_ai.data_preparation.models.pipelines.integration_pipeline import (
    IntegrationPipeline,
)
from mage_ai.data_preparation.models.triggers import ScheduleInterval
from mage_ai.orchestration.db import db_connection
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.orchestration.metrics.pipeline_run import calculate_pipeline_run_metrics
from mage_ai.shared.array import find
from mage_ai.shared.hash import index_by, merge_dict

SQL_SOURCES_UUID = [d.get('uuid', d['name'].lower()) for d in SQL_SOURCES]


def get_extra_variables(pipeline: IntegrationPipeline) -> Dict:
    return {
        'pipeline.name': pipeline.name,
        'pipeline.uuid': pipeline.uuid,
        'pipeline_uuid': pipeline.uuid,
    }


def clear_source_output_files(
    pipeline_run: PipelineRun,
    integration_pipeline,
    logger: DictLogger,
) -> None:
    tags = dict(
        pipeline_run_id=pipeline_run.id,
        pipeline_uuid=pipeline_run.pipeline_uuid,
    )

    for stream in integration_pipeline.streams():
        tap_stream_id = stream['tap_stream_id']
        source_output_folder = integration_pipeline.source_output_folder(tap_stream_id)
        if os.path.exists(source_output_folder):
            logger.info(
                f'Removing source output directory for stream {tap_stream_id} at '
                f'{source_output_folder}.',
                tags=merge_dict(tags, dict(
                    source_output_folder=source_output_folder,
                )),
            )
            shutil.rmtree(source_output_folder)


def initialize_state_and_runs(
    pipeline_run: PipelineRun,
    pipeline,
    logger: DictLogger,
    variables: Dict,
) -> List[BlockRun]:
    tags = dict(
        pipeline_run_id=pipeline_run.id,
        pipeline_uuid=pipeline_run.pipeline_uuid,
    )

    try:
        update_stream_states(pipeline_run, pipeline, logger, variables)

        block_runs = create_block_runs(pipeline_run, pipeline, logger, variables=variables)

        calculate_pipeline_run_metrics(
            pipeline_run,
            pipeline,
            logger=logger,
            logging_tags=tags,
        )

        return block_runs
    except Exception as err:
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.FAILED)

        logger.exception(
            str(err),
            error=err,
            tags=tags,
        )

        raise err


def create_block_runs(
    pipeline_run: PipelineRun,
    pipeline,
    logger: DictLogger,
    variables: Dict = None,
) -> List[BlockRun]:
    if variables is None:
        variables = dict()

    integration_pipeline = pipeline

    blocks = integration_pipeline.get_executable_blocks()
    executable_blocks = []

    # we expect that blocks in integration pipelines only have 1 downstream block, and
    # that there is only 1 root block and 1 leaf block.
    current_block = integration_pipeline.data_loader
    while True:
        block = find(lambda b, current_block=current_block: b.uuid == current_block.uuid, blocks)
        executable_blocks.append(block)
        downstream_blocks = current_block.downstream_blocks
        if len(downstream_blocks) == 0:
            break
        current_block = downstream_blocks[0]

    data_loader_block = integration_pipeline.data_loader
    data_exporter_block = integration_pipeline.data_exporter

    if data_exporter_block is None:
        raise Exception("No Destination Block was found. \
                         Mage expects 1 Source and 1 Destination Block")

    # Get batch fetch limit
    source_config, _ = build_config(data_loader_block.file_path, variables)
    batch_fetch_limit = get_batch_fetch_limit(source_config)

    transformer_blocks = [b for b in executable_blocks if b.uuid not in [
        data_loader_block.uuid,
        data_exporter_block.uuid,
    ]]

    is_sql_source = integration_pipeline.source_uuid in SQL_SOURCES_UUID
    record_counts_by_stream = {}
    if is_sql_source:
        record_counts_by_stream = index_by(lambda x: x['id'], integration_pipeline.count_records())

    arr = []

    for stream in integration_pipeline.streams():
        tap_stream_id = stream['tap_stream_id']

        tags = dict(
            source=integration_pipeline.source_uuid,
            stream=tap_stream_id,
        )

        record_counts = None
        if is_sql_source:
            record_counts = record_counts_by_stream[tap_stream_id]['count']
        number_of_batches = math.ceil((record_counts or 1) / batch_fetch_limit)
        tags2 = merge_dict(tags, dict(
            number_of_batches=number_of_batches,
            record_counts=record_counts,
        ))

        logger.info(
            f"Number of records for stream {tap_stream_id}: "
            f"{'N/A' if record_counts is None else record_counts}.",
            tags=tags2,
        )
        logger.info(
            f"Number of batches for loading data from stream {tap_stream_id}: {number_of_batches}.",
            tags=tags2,
        )

        for idx in range(number_of_batches):
            arr += [
                pipeline_run.create_block_run(
                    f'{data_loader_block.uuid}:{tap_stream_id}:{idx}',
                    commit=False,
                ),
            ] + [pipeline_run.create_block_run(
                    f'{b.uuid}:{tap_stream_id}:{idx}',
                    commit=False,
                ) for b in transformer_blocks] + [
                pipeline_run.create_block_run(
                    f'{data_exporter_block.uuid}:{tap_stream_id}:{idx}',
                    commit=False,
                ),
            ]
            try:
                db_connection.session.commit()
            except Exception as e:
                db_connection.session.rollback()
                raise Exception(f'Failed to create block runs for {tap_stream_id}:{idx}.') from e
    return arr


def update_stream_states(
    pipeline_run: PipelineRun,
    pipeline,
    logger: DictLogger,
    variables: Dict,
) -> None:
    from mage_integrations.sources.utils import (
        update_source_state_from_destination_state,
    )

    for stream in pipeline.streams(variables):
        tap_stream_id = stream['tap_stream_id']
        destination_table = stream.get('destination_table', tap_stream_id)

        tags = dict(
            destination_table=destination_table,
            pipeline_run_id=pipeline_run.id,
            pipeline_uuid=pipeline_run.pipeline_uuid,
            stream=tap_stream_id,
        )

        logger.info(
            f'Updating source state from destination state for stream '
            f'{tap_stream_id} and table {destination_table}.',
            tags=tags,
        )
        source_state_file_path = pipeline.source_state_file_path(
            destination_table=destination_table,
            stream=tap_stream_id,
        )
        destination_state_file_path = pipeline.destination_state_file_path(
            destination_table=destination_table,
            stream=tap_stream_id,
        )
        update_source_state_from_destination_state(
            source_state_file_path,
            destination_state_file_path,
        )

        with open(source_state_file_path, 'r') as f:
            text = f.read()
            d = json.loads(text) if text else {}
            bookmark_values = d.get('bookmarks', {}).get(tap_stream_id)
            logger.info(
                f'Source state for stream {tap_stream_id}: {bookmark_values}',
                tags=merge_dict(tags, d),
            )

        with open(destination_state_file_path, 'r') as f:
            text = f.read()
            d = json.loads(text) if text else {}
            bookmark_values = d.get('bookmarks', {}).get(tap_stream_id)
            logger.info(
                f'Destination state for stream {tap_stream_id}: {bookmark_values}',
                tags=merge_dict(tags, d),
            )


def build_block_run_metadata(
    block,
    logger: DictLogger,
    data_integration_settings: Dict = None,
    dynamic_block_index: Union[int, None] = None,
    dynamic_upstream_block_uuids: Union[List[str], None] = None,
    global_vars: Union[Dict, None] = None,
    logging_tags: Dict = None,
    parent_stream: str = None,
    partition: str = None,
    pipeline_run: PipelineRun = None,
    selected_streams: List[str] = None,
) -> List[Dict]:
    block_run_metadata = []

    if not block.is_data_integration():
        return block_run_metadata

    data_integration_settings or block.get_data_integration_settings(
        dynamic_block_index=dynamic_block_index,
        dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
        from_notebook=False,
        global_vars=global_vars,
        partition=partition,
    )

    if block.is_source():
        return __build_block_run_metadata_for_source(
            block,
            data_integration_settings,
            logger,
            logging_tags=logging_tags,
            pipeline_run=pipeline_run,
            selected_streams=selected_streams,
        )

    return __build_block_run_metadata_for_destination(
        block,
        data_integration_settings,
        logger,
        dynamic_block_index=dynamic_block_index,
        dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
        global_vars=global_vars,
        logging_tags=logging_tags,
        parent_stream=parent_stream,
        partition=partition,
        selected_streams=selected_streams,
    )


def __build_block_run_metadata_for_destination(
    block,
    data_integration_settings: Dict,
    logger: DictLogger,
    dynamic_block_index: Union[int, None] = None,
    dynamic_upstream_block_uuids: Union[List[str], None] = None,
    global_vars: Union[Dict, None] = None,
    logging_tags: Dict = None,
    parent_stream: str = None,
    partition: str = None,
    selected_streams: List[str] = None,
) -> List[Dict]:
    block_run_metadata = []
    data_integration_uuid = data_integration_settings.get('data_integration_uuid')
    pipeline = block.pipeline

    # Convert the upstream input data to Singer Spec
    for stream_id in (selected_streams or []):
        tags = merge_dict(logging_tags, dict(
            data_integration_uuid=data_integration_uuid,
            stream=stream_id,
        ))

        if parent_stream:
            block_stream = pipeline.get_block(parent_stream)
        else:
            block_stream = pipeline.get_block(stream_id)

        if not block_stream:
            logger.info(
                f'Block for stream {stream_id} doesn’t exist in pipeline {pipeline.uuid}.',
                **tags,
            )
            continue

        output_file_paths = []

        is_source = block_stream.is_source()
        # If upstream is source, skip conversion.
        if is_source:
            output_file_paths = get_streams_from_output_directory(
                block_stream,
                execution_partition=partition,
            ).get(stream_id)
        else:
            # If upstream not a source, convert first.
            tup = convert_block_output_data_for_destination(
                block,
                chunk_size=MAX_QUERY_STRING_SIZE,
                data_integration_uuid=data_integration_uuid,
                dynamic_block_index=dynamic_block_index,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                global_vars=global_vars,
                logger=logger,
                logging_tags=logging_tags,
                partition=partition,
                stream=stream_id,
            )
            if tup:
                output_file_paths = tup[0]

        # Create a child block run in batches.
        # Each batch will be based on number of output files in the output file path.
        number_of_batches = len(output_file_paths)
        tags2 = merge_dict(tags, dict(
            number_of_batches=number_of_batches,
        ))
        logger.info(
            f'Number of batches for loading data from stream {stream_id}: {number_of_batches}.',
            **tags2,
        )

        for idx in range(number_of_batches):
            md = dict(
                index=idx,
                number_of_batches=number_of_batches,
                stream=stream_id,
            )
            if is_source:
                md['parent_stream'] = parent_stream

            block_run_metadata.append(md)

    return block_run_metadata


def __build_block_run_metadata_for_source(
    block,
    data_integration_settings: Dict,
    logger: DictLogger,
    logging_tags: Dict = None,
    pipeline_run: PipelineRun = None,
    selected_streams: List[str] = None,
) -> List[Dict]:
    block_run_metadata = []

    catalog = data_integration_settings.get('catalog')
    config = data_integration_settings.get('config')
    batch_fetch_limit = get_batch_fetch_limit(config)

    stream_dicts_by_stream_id = index_by(
        lambda x: x.get('tap_stream_id') or x.get('stream'),
        get_selected_streams(catalog),
    )

    streams = []

    if selected_streams:
        streams = selected_streams
    else:
        streams = list(stream_dicts_by_stream_id.keys())

    at_least_one_incremental = False

    for stream_id in streams:
        if at_least_one_incremental:
            break

        stream_dict = stream_dicts_by_stream_id.get(stream_id)
        if not stream_dict:
            continue

        if REPLICATION_METHOD_INCREMENTAL == stream_dict.get(KEY_REPLICATION_METHOD):
            at_least_one_incremental = True
            break

    execution_partition_previous = None

    if at_least_one_incremental and pipeline_run:
        pipeline_runs_completed = \
            PipelineRun.recently_completed_pipeline_runs(
                pipeline_run.pipeline_uuid,
                pipeline_run_id=pipeline_run.id,
                pipeline_schedule_id=(
                    None if
                    ScheduleInterval.ONCE == pipeline_run.pipeline_schedule.schedule_interval else
                    pipeline_run.pipeline_schedule_id
                ),
                sample_size=1,
            )

        if pipeline_runs_completed:
            execution_partition_previous = pipeline_runs_completed[0].execution_partition

    data_integration_uuid = data_integration_settings.get('data_integration_uuid')

    is_sql_source = data_integration_uuid in SQL_SOURCES_UUID
    record_counts_by_stream = {}
    if is_sql_source:

        record_counts_by_stream = index_by(
            lambda x: x['id'],
            count_records(
                config,
                data_integration_uuid,
                streams,
                block=block,
                catalog=catalog,
                partition=execution_partition_previous,
                variables=pipeline_run.variables if pipeline_run else None,
            ),
        )

    for tap_stream_id in streams:
        tags = merge_dict(logging_tags, dict(
            data_integration_uuid=data_integration_uuid,
            stream=tap_stream_id,
        ))

        record_counts = None
        if is_sql_source:
            record_counts = record_counts_by_stream[tap_stream_id]['count']
        number_of_batches = math.ceil((record_counts or 1) / batch_fetch_limit)
        tags2 = merge_dict(tags, dict(
            number_of_batches=number_of_batches,
            record_counts=record_counts,
        ))

        logger.info(
            f"Number of records for stream {tap_stream_id}: "
            f"{'N/A' if record_counts is None else record_counts}.",
            **tags2,
        )
        logger.info(
            f"Number of batches for loading data from stream {tap_stream_id}: {number_of_batches}.",
            **tags2,
        )

        for idx in range(number_of_batches):
            block_run_metadata.append(dict(
                execution_partition_previous=execution_partition_previous,
                index=idx,
                number_of_batches=number_of_batches,
                stream=tap_stream_id,
            ))

    return block_run_metadata
