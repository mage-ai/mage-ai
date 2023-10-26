from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild
from mage_ai.services.spark.api.local import LocalAPI


class SparkEnvironmentResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def member(self, _pk, user, **kwargs):
        application_id = await self.get_application_id(**kwargs)

        return self(
            await LocalAPI().environment(application_id=application_id),
            user,
            **kwargs,
        )
