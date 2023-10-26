from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild
from mage_ai.services.spark.api.local import LocalAPI


class SparkStageAttemptTaskSummaryResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def member(self, pk, user, **kwargs):
        application_id = await self.get_application_id()

        parent_model = kwargs.get('parent_model')
        if parent_model is None:
            error = ApiError(ApiError.RESOURCE_NOT_FOUND)
            error.message = 'Stage not found.'
            raise error

        return self(
            await LocalAPI().stage_attempt_task_summary(
                application_id=application_id,
                attempt_id=pk,
                stage_id=parent_model.id,
            ),
            user,
            **kwargs,
        )
