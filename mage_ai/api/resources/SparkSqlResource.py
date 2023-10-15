from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild
from mage_ai.services.spark.api.local import LocalAPI


class SparkSqlResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        application_id = await self.get_application_id(**kwargs)

        return self.build_result_set(
            await LocalAPI().sqls(application_id=application_id),
            user,
            **kwargs,
        )

    @classmethod
    async def member(self, pk, user, **kwargs):
        application_id = await self.get_application_id(**kwargs)

        return self(
            await LocalAPI().sql(application_id=application_id, sql_id=pk),
            user,
            **kwargs,
        )
