from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild
from mage_ai.services.spark.api.local import LocalAPI


class SparkEnvironmentResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def member(self, _pk, user, **kwargs):
        return self(
            await LocalAPI().environment(),
            user,
            **kwargs,
        )
