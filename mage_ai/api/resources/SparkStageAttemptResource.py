from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild


class SparkStageAttemptResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        return self.build_result_set(
            await self.build_api().stage_attempts(
                stage_id=parent_model.id,
            ),
            user,
            **kwargs,
        )

    @classmethod
    async def member(self, pk, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        return self(
            await self.build_api().stage_attempt(
                attempt_id=pk,
                stage_id=parent_model.id,
            ),
            user,
            **kwargs,
        )
