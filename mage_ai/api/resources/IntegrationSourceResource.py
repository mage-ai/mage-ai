import traceback
import urllib.parse
from typing import Dict, List

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.PipelineRunResource import PipelineRunResource
from mage_ai.api.resources.PipelineScheduleResource import PipelineScheduleResource
from mage_ai.data_integrations.sources.constants import SOURCES
from mage_ai.data_preparation.models.block.data_integration.constants import (
    KEY_REPLICATION_METHOD,
    REPLICATION_METHOD_INCREMENTAL,
)
from mage_ai.data_preparation.models.block.data_integration.utils import (
    get_state_data,
    test_connection,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.pipelines.integration_pipeline import (
    IntegrationPipeline,
)
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import PipelineRun
from mage_ai.server.api.integration_sources import get_collection


def get_state_data_for_blocks(
    pipeline: Pipeline,
    block_uuids: List[str],
    pipeline_schedule_id: int = None,
    stream: str = None,
) -> List[Dict]:
    arr = []

    for block_uuid in block_uuids:
        block = pipeline.get_block(block_uuid)

        data_integration_uuid = None
        execution_partition_previous = None
        pipeline_run = None
        pipeline_schedule = None
        state_data_by_stream = {}

        pipeline_runs = PipelineRun.recently_completed_pipeline_runs(
            pipeline.uuid,
            pipeline_schedule_id=pipeline_schedule_id,
            sample_size=1,
        )
        if pipeline_runs:
            pipeline_run = pipeline_runs[0]
            execution_partition_previous = pipeline_run.execution_partition
            pipeline_schedule = pipeline_run.pipeline_schedule

        if execution_partition_previous:
            settings = block.get_data_integration_settings(
                partition=execution_partition_previous,
            )
            catalog = settings.get('catalog')

            if catalog and catalog.get('streams'):
                for stream_dict in (catalog.get('streams') or []):
                    stream_id = stream_dict.get('tap_stream_id') or stream_dict.get('stream')
                    if stream and stream != stream_id:
                        continue

                    if REPLICATION_METHOD_INCREMENTAL != stream_dict.get(
                        KEY_REPLICATION_METHOD,
                    ):
                        continue

                    data_integration_uuid = settings.get('data_integration_uuid')
                    state_data, record = get_state_data(
                        block,
                        catalog,
                        data_integration_uuid=data_integration_uuid,
                        include_record=True,
                        partition=execution_partition_previous,
                        stream_id=stream_id,
                    )
                    state_data_by_stream[stream_id] = dict(
                        record=record,
                        state=state_data,
                    )

        arr.append(dict(
            block=block.to_dict(),
            partition=execution_partition_previous,
            pipeline_run=pipeline_run,
            pipeline_schedule=pipeline_schedule,
            streams=state_data_by_stream,
            uuid=data_integration_uuid,
        ))

    return arr


class IntegrationSourceResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        collection = []

        parent_model = kwargs.get('parent_model')
        if parent_model and isinstance(parent_model, Pipeline):
            block_uuids = query.get('block_uuid[]', [])
            if block_uuids:
                block_uuids = block_uuids[0]
            if block_uuids:
                block_uuids = block_uuids.split(',')

            for state_data in get_state_data_for_blocks(parent_model, block_uuids):
                if state_data.get('pipeline_run'):
                    state_data['pipeline_run'] = PipelineRunResource(
                        state_data['pipeline_run'],
                        user,
                        **kwargs,
                    )

                if state_data.get('pipeline_schedule'):
                    state_data['pipeline_schedule'] = PipelineScheduleResource(
                        state_data['pipeline_schedule'],
                        user,
                        **kwargs,
                    )

                collection.append(state_data)
        else:
            collection = get_collection('sources', SOURCES)

        return self.build_result_set(
            collection,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        error_message = None
        success = False
        streams = []

        action_type = payload['action_type']
        if 'test_connection' == action_type:
            pipeline_uuid = payload['pipeline_uuid']
            block_uuid = payload.get('block_uuid')

            if block_uuid:
                pipeline = Pipeline.get(pipeline_uuid)
                block = pipeline.get_block(block_uuid)
                try:
                    test_connection(block)
                    success = True
                except Exception as e:
                    traceback.print_exc()
                    error_message = str(e)
            else:
                pipeline = IntegrationPipeline.get(pipeline_uuid)
                config = payload['config']

                try:
                    pipeline.test_connection(BlockType.DATA_LOADER, config=config)
                    success = True
                except Exception as e:
                    traceback.print_exc()
                    error_message = str(e)
        elif 'sample_data' == action_type:
            pipeline_uuid = payload['pipeline_uuid']
            pipeline = IntegrationPipeline.get(pipeline_uuid)

            streams_updated = pipeline.preview_data(
                BlockType.DATA_LOADER,
                streams=payload.get('streams'),
            )
            streams = list(streams_updated)
            success = True

        return self(dict(
            error_message=error_message,
            streams=streams,
            success=success,
        ), user, **kwargs)

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        parent_model = kwargs.get('parent_model')
        query = kwargs.get('query', {})

        pipeline_schedule_id = query.get('pipeline_schedule_id', [None])
        if pipeline_schedule_id:
            pipeline_schedule_id = pipeline_schedule_id[0]

        stream = query.get('stream', [None])
        if stream:
            stream = stream[0]

        if parent_model and isinstance(parent_model, Pipeline):
            block_uuid = urllib.parse.unquote(pk)
            state_data_arr = get_state_data_for_blocks(
                parent_model,
                [block_uuid],
                pipeline_schedule_id=pipeline_schedule_id,
                stream=stream,
            )

            state_data = state_data_arr[0]

            if state_data.get('pipeline_run'):
                state_data['pipeline_run'] = PipelineRunResource(
                    state_data['pipeline_run'],
                    user,
                    **kwargs,
                )

            if state_data.get('pipeline_schedule'):
                state_data['pipeline_schedule'] = PipelineScheduleResource(
                    state_data['pipeline_schedule'],
                    user,
                    **kwargs,
                )

            return self(state_data, user, **kwargs)

        return self(IntegrationPipeline.get(pk), user, **kwargs)
