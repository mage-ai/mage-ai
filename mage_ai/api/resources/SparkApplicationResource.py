from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.services.spark.api.local import LocalAPI


class SparkApplicationResource(GenericResource):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        return self.build_result_set(
            LocalAPI().applications(),
            user,
            **kwargs,
        )
