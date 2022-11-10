from mage_ai.data_integrations.utils.config import get_catalog
from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline
from mage_ai.orchestration.db.models import BlockRun
from mage_ai.shared.array import find
from typing import Dict, List, Tuple


def create_block_runs(pipeline_run) -> List[Tuple['BlockRun', Dict]]:
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

    arr = []

    for stream in catalog['streams']:
        tap_stream_id = stream['tap_stream_id']

        arr += [
            (
                pipeline_run.create_block_run(
                    f'{data_loader_block.uuid}:{tap_stream_id}',
                ),
                dict(
                    selected_streams=[tap_stream_id],
                ),
            ),
        ] + [(
            pipeline_run.create_block_run(
                f'{b.uuid}:{tap_stream_id}',
            ),
            {},
        ) for b in transformer_blocks] + [
            (
                pipeline_run.create_block_run(
                    f'{data_exporter_block.uuid}:{tap_stream_id}',
                ),
                dict(
                    destination_table=stream.get('destination_table'),
                ),
            ),
        ]

    return arr
