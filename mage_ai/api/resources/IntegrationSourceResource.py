from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_integrations.sources.constants import SOURCES
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.server.api.integration_sources import get_collection


class IntegrationSourceResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
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
            pipeline = IntegrationPipeline.get(pipeline_uuid)
            config = payload['config']

            try:
                pipeline.test_connection(BlockType.DATA_LOADER, config=config)
                success = True
            except Exception as e:
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
        return self(IntegrationPipeline.get(pk), user, **kwargs)
