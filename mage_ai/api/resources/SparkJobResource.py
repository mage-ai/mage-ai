from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild
from mage_ai.services.spark.api.local import LocalAPI


class SparkJobResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        return self.build_result_set(
            await LocalAPI().jobs(),
            user,
            **kwargs,
        )

    @classmethod
    async def member(self, pk, user, **kwargs):
        return self(
            await LocalAPI().job(job_id=pk),
            user,
            **kwargs,
        )
