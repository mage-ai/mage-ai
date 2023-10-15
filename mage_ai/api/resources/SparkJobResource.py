from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.services.spark.api.local import LocalAPI


class SparkJobResource(GenericResource):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        application_id = await self.__get_application_id(**kwargs)

        return self.build_result_set(
            await LocalAPI().jobs(application_id=application_id),
            user,
            **kwargs,
        )

    @classmethod
    async def member(self, pk, user, **kwargs):
        application_id = await self.__get_application_id(**kwargs)

        return self(
            await LocalAPI().job(application_id=application_id, job_id=pk),
            user,
            **kwargs,
        )

    @classmethod
    async def __get_application_id(self, **kwargs):
        application_id = None
        parent_model = kwargs.get('parent_model')
        if parent_model:
            application_id = parent_model.id
        else:
            models = await LocalAPI().applications()
            if models and len(models) >= 1:
                application_id = models[0].id

        if not application_id:
            error = ApiError(ApiError.RESOURCE_NOT_FOUND)
            error.message = \
                'No application found, cannot retrieve jobs without an application specified.'
            raise error

        return application_id
