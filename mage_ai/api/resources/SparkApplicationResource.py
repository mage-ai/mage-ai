from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.services.spark.api.local import LocalAPI
from mage_ai.services.spark.models.applications import Application
from mage_ai.shared.hash import index_by


class SparkApplicationResource(GenericResource):
    @classmethod
    async def get_model(self, pk):
        return Application.load(id=pk)

    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        applications = await LocalAPI().applications()
        mapping = index_by(lambda x: x.id, applications)

        applications_cache = Application.get_applications_from_cache()
        if applications_cache:
            for application in applications_cache.values():
                if application.id in mapping:
                    continue
                applications.append(application)
                mapping[application.id] = application

        return self.build_result_set(
            applications,
            user,
            **kwargs,
        )
