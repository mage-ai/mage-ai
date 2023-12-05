from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild


class SparkThreadResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        return self.build_result_set(
            await self.build_api().threads(
                executor_id=parent_model.id,
            ),
            user,
            **kwargs,
        )
