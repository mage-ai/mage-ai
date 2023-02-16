from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_integrations.destinations.constants import DESTINATIONS
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline
from mage_ai.server.api.integration_sources import get_collection


class IntegrationDestinationResource(GenericResource):
    @classmethod
    async def collection(self, query, meta, user, **kwargs):
        collection = get_collection('destinations', DESTINATIONS)

        return self.build_result_set(
            collection,
            user,
            **kwargs,
        )

    @classmethod
    def create(self, payload, user, **kwargs):
        error_message = None
        success = False

        action_type = payload['action_type']
        if 'test_connection' == action_type:
            pipeline_uuid = payload['pipeline_uuid']
            pipeline = IntegrationPipeline.get(pipeline_uuid)
            config = payload['config']

            try:
                pipeline.test_connection(BlockType.DATA_EXPORTER, config=config)
                success = True
            except Exception as e:
                error_message = str(e)

        return self(dict(error_message=error_message, success=success), user, **kwargs)
