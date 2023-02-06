from mage_ai.data_integrations.sources.constants import SQL_SOURCES
from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline
from mage_ai.orchestration.db.models import BlockRun, PipelineRun
from mage_ai.orchestration.metrics.pipeline_run import calculate_metrics
from mage_ai.shared.array import find
from mage_ai.shared.hash import index_by, merge_dict
from typing import Dict, List
import json
import math
import os
import shutil


SQL_SOURCES_UUID = [d.get('uuid', d['name'].lower()) for d in SQL_SOURCES]


def clear_source_output_files(
    pipeline_run: PipelineRun,
    logger: DictLogger,
) -> None:
    tags = dict(
        pipeline_run_id=pipeline_run.id,
        pipeline_uuid=pipeline_run.pipeline_uuid,
    )

    integration_pipeline = IntegrationPipeline.get(pipeline_run.pipeline_uuid)

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
    logger: DictLogger,
    variables: Dict,
) -> List[BlockRun]:
    tags = dict(
        pipeline_run_id=pipeline_run.id,
        pipeline_uuid=pipeline_run.pipeline_uuid,
    )

    try:
        update_stream_states(pipeline_run, logger, variables)

        block_runs = create_block_runs(pipeline_run, logger)

        logger.info(
            f'Calculate metrics for pipeline run {pipeline_run.id} started.',
            tags=tags,
        )
        calculate_metrics(pipeline_run)
        logger.info(
            f'Calculate metrics for pipeline run {pipeline_run.id} completed.',
            tags=merge_dict(tags, dict(metrics=pipeline_run.metrics)),
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


def create_block_runs(pipeline_run: PipelineRun, logger: DictLogger) -> List[BlockRun]:
    from mage_integrations.sources.constants import BATCH_FETCH_LIMIT

    integration_pipeline = IntegrationPipeline.get(pipeline_run.pipeline_uuid)

    blocks = integration_pipeline.get_executable_blocks()
    executable_blocks = []

    # we expect that blocks in integration pipelines only have 1 downstream block, and
    # that there is only 1 root block and 1 leaf block.
    current_block = integration_pipeline.data_loader
    while True:
        block = find(lambda b: b.uuid == current_block.uuid, blocks)
        executable_blocks.append(block)
        downstream_blocks = current_block.downstream_blocks
        if len(downstream_blocks) == 0:
            break
        current_block = downstream_blocks[0]

    data_loader_block = integration_pipeline.data_loader
    data_exporter_block = integration_pipeline.data_exporter

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
        number_of_batches = math.ceil((record_counts or 1) / BATCH_FETCH_LIMIT)
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
                ),
            ] + [pipeline_run.create_block_run(
                    f'{b.uuid}:{tap_stream_id}:{idx}',
                ) for b in transformer_blocks] + [
                pipeline_run.create_block_run(
                    f'{data_exporter_block.uuid}:{tap_stream_id}:{idx}',
                ),
            ]

    return arr


def update_stream_states(pipeline_run: PipelineRun, logger: DictLogger, variables: Dict) -> None:
    from mage_integrations.sources.utils import update_source_state_from_destination_state

    integration_pipeline = IntegrationPipeline.get(pipeline_run.pipeline_uuid)

    for stream in integration_pipeline.streams(variables):
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
        source_state_file_path = integration_pipeline.source_state_file_path(
            destination_table=destination_table,
            stream=tap_stream_id,
        )
        destination_state_file_path = integration_pipeline.destination_state_file_path(
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
