from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild
from mage_ai.services.spark.api.local import LocalAPI


class SparkSqlResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def collection(self, query_arg, _meta, user, **kwargs):
        query = {}

        length = query_arg.get('length', [False])
        if length:
            length = length[0]
            if length:
                query['length'] = length

        application_id = await self.get_application_id(**kwargs)

        return self.build_result_set(
            await LocalAPI().sqls(application_id=application_id, query=query),
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
