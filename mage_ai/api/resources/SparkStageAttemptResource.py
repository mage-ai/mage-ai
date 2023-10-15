from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.services.spark.api.local import LocalAPI


class SparkStageAttemptResource(GenericResource):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')
        application_id = await self.__get_application_id()

        return self.build_result_set(
            await LocalAPI().stage_attempts(
                application_id=application_id,
                stage_id=parent_model.id,
            ),
            user,
            **kwargs,
        )

    @classmethod
    async def member(self, pk, user, **kwargs):
        parent_model = kwargs.get('parent_model')
        application_id = await self.__get_application_id()

        return self(
            await LocalAPI().stage_attempt(
                application_id=application_id,
                attempt_id=pk,
                stage_id=parent_model.id,
            ),
            user,
            **kwargs,
        )

    @classmethod
    async def __get_application_id(self, **kwargs) -> str:
        application_id = None
        models = await LocalAPI().applications()
        if models and len(models) >= 1:
            application_id = models[0].id

        if not application_id:
            error = ApiError(ApiError.RESOURCE_NOT_FOUND)
            error.message = \
                'No application found, cannot retrieve stages without an application specified.'
            raise error

        return application_id
