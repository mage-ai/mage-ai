from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild
from mage_ai.services.spark.api.local import LocalAPI
from mage_ai.services.spark.models.stages import Stage


class SparkStageResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        application_id = await self.get_application_id(**kwargs)

        return self.build_result_set(
            await LocalAPI().stages(application_id=application_id),
            user,
            **kwargs,
        )

    @classmethod
    async def get_model(self, pk) -> Stage:
        return Stage.load(stage_id=pk)
