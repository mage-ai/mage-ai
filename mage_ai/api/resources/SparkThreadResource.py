from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild
from mage_ai.services.spark.api.local import LocalAPI


class SparkThreadResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        application_id = await self.get_application_id(**kwargs)
        parent_model = kwargs.get('parent_model')

        return self.build_result_set(
            await LocalAPI().threads(
                application_id=application_id,
                executor_id=parent_model.id,
            ),
            user,
            **kwargs,
        )
