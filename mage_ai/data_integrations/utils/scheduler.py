from mage_ai.data_integrations.sources.constants import SQL_SOURCES
from mage_ai.data_integrations.utils.config import get_catalog
from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline
from mage_ai.orchestration.db.models import BlockRun
from mage_ai.shared.array import find
from mage_ai.shared.hash import index_by
from typing import Dict, List, Tuple
import math


SQL_SOURCES_UUID = [d.get('uuid', d['name'].lower()) for d in SQL_SOURCES]


def create_block_runs(pipeline_run) -> List[Tuple['BlockRun', Dict]]:
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

    catalog = get_catalog(data_loader_block)

    is_sql_source = integration_pipeline.source_uuid in SQL_SOURCES_UUID
    record_counts_by_stream = {}
    if is_sql_source:
        record_counts_by_stream = index_by(lambda x: x['id'], integration_pipeline.count_records())

    arr = []

    for stream in catalog['streams']:
        tap_stream_id = stream['tap_stream_id']

        record_counts = 1
        if is_sql_source:
            record_counts = record_counts_by_stream[tap_stream_id]['count']

        number_of_batches = math.ceil(record_counts / BATCH_FETCH_LIMIT)
        for idx in range(number_of_batches):
            arr += [
                (
                    pipeline_run.create_block_run(
                        f'{data_loader_block.uuid}:{tap_stream_id}:{idx}',
                    ),
                    dict(
                        index=idx,
                        selected_streams=[tap_stream_id],
                    ),
                ),
            ] + [(
                pipeline_run.create_block_run(
                    f'{b.uuid}:{tap_stream_id}:{idx}',
                ),
                {},
            ) for b in transformer_blocks] + [
                (
                    pipeline_run.create_block_run(
                        f'{data_exporter_block.uuid}:{tap_stream_id}:{idx}',
                    ),
                    dict(
                        destination_table=stream.get('destination_table'),
                    ),
                ),
            ]

    return arr
