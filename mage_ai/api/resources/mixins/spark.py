from mage_ai.api.errors import ApiError
from mage_ai.services.spark.api.base import BaseAPI
from mage_ai.services.spark.api.service import API
from mage_ai.services.spark.models.applications import Application


class SparkApplicationChild:
    @classmethod
    def build_api(self) -> BaseAPI:
        return API.build()

    @classmethod
    async def get_application_id(self, **kwargs) -> str:
        application_id = None
        parent_model = kwargs.get('parent_model')
        if parent_model and isinstance(parent_model, Application):
            application_id = parent_model.id
        else:
            models = await self.build_api().applications()
            if models and len(models) >= 1:
                application_id = models[0].id

        if not application_id:
            error = ApiError(ApiError.RESOURCE_NOT_FOUND)
            error.message = \
                'No application found, cannot retrieve stages without an application specified.'
            raise error

        return application_id
