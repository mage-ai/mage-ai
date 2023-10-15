from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.services.spark.api.local import LocalAPI
from mage_ai.services.spark.models.applications import Application


class SparkApplicationResource(GenericResource):
    @classmethod
    async def get_model(self, pk):
        return Application.load(id=pk)

    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        return self.build_result_set(
            await LocalAPI().applications(),
            user,
            **kwargs,
        )
