from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild
from mage_ai.services.spark.api.local import LocalAPI


class SparkStageAttemptResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        return self.build_result_set(
            await LocalAPI().stage_attempts(
                stage_id=parent_model.id,
            ),
            user,
            **kwargs,
        )

    @classmethod
    async def member(self, pk, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        return self(
            await LocalAPI().stage_attempt(
                attempt_id=pk,
                stage_id=parent_model.id,
            ),
            user,
            **kwargs,
        )
