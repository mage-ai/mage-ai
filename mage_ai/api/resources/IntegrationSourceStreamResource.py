from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline


class IntegrationSourceStreamResource(GenericResource):
    @classmethod
    def member(self, pk, user, **kwargs):
        return self(IntegrationPipeline.get(pk), user, **kwargs)
