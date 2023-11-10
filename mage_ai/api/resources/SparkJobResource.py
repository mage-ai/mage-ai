from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild
from mage_ai.services.spark.api.local import LocalAPI


class SparkJobResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        return self.build_result_set(
            await LocalAPI().jobs(),
            user,
            **kwargs,
        )

    @classmethod
    async def member(self, pk, user, **kwargs):
        query_arg = kwargs.get('query')

        application_id = query_arg.get('application_id', [])
        if application_id:
            application_id = application_id[0]

        application_spark_ui_url = query_arg.get('application_spark_ui_url', [])
        if application_spark_ui_url:
            application_spark_ui_url = application_spark_ui_url[0]

        return self(
            await LocalAPI().job(
                job_id=pk,
                application_id=application_id,
                application_spark_ui_url=application_spark_ui_url,
            ),
            user,
            **kwargs,
        )
