from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild
from mage_ai.services.spark.api.local import LocalAPI
from mage_ai.services.spark.models.stages import Stage


class SparkStageResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def collection(self, _query, _meta, user, **kwargs):
        application_id = await self.get_application_id(**kwargs)

        return self.build_result_set(
            await LocalAPI().stages(application_id=application_id),
            user,
            **kwargs,
        )

    @classmethod
    async def get_model(self, pk) -> Stage:
        return Stage.load(stage_id=pk)

    @classmethod
    async def member(self, pk, user, **kwargs):
        query_arg = kwargs.get('query', {})

        query = {}
        quantiles = query_arg.get('quantiles', [None])
        if quantiles:
            quantiles = quantiles[0]
            if quantiles:
                query['quantiles'] = quantiles

        with_summaries = query_arg.get('withSummaries', [False])
        if with_summaries:
            with_summaries = with_summaries[0]
            if quantiles:
                query['withSummaries'] = with_summaries

        application_id = await self.get_application_id(**kwargs)
        stage = await LocalAPI().stage(
            application_id=application_id,
            stage_id=pk,
            query=query if query else None,
        )

        return self(stage, user, **kwargs)
