from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild
from mage_ai.services.spark.api.local import LocalAPI


class SparkStageAttemptTaskResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def collection(self, query, _meta, user, **kwargs):
        attempt_id = query.get('attempt_id', [None])
        if attempt_id is not None:
            attempt_id = attempt_id[0]

        application_id = await self.get_application_id()

        parent_model = kwargs.get('parent_model')
        if parent_model is None:
            error = ApiError(ApiError.RESOURCE_NOT_FOUND)
            error.message = 'Stage not found.'
            raise error

        return self.build_result_set(
            await LocalAPI().stage_attempt_tasks(
                application_id=application_id,
                attempt_id=attempt_id,
                stage_id=parent_model.id,
            ),
            user,
            **kwargs,
        )
