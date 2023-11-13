from functools import reduce

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.mixins.spark import SparkApplicationChild


class SparkSqlResource(GenericResource, SparkApplicationChild):
    @classmethod
    async def collection(self, query_arg, _meta, user, **kwargs):
        query = {}

        length = query_arg.get('length', [False])
        if length:
            length = length[0]
            if length:
                query['length'] = length

        application_id = self.application_calculated_id_from_query(query_arg)

        application_spark_ui_url = query_arg.get('application_spark_ui_url', [])
        if application_spark_ui_url:
            application_spark_ui_url = application_spark_ui_url[0]

        return self.build_result_set(
            await self.build_api().sqls(
                application_id=application_id,
                application_spark_ui_url=application_spark_ui_url,
                query=query,
            ),
            user,
            **kwargs,
        )

    @classmethod
    async def member(self, pk, user, **kwargs):
        query_arg = kwargs.get('query') or {}

        include_jobs_and_stages = query_arg.get('include_jobs_and_stages', [False])
        if include_jobs_and_stages:
            include_jobs_and_stages = include_jobs_and_stages[0]

        application_id = self.application_calculated_id_from_query(query_arg)

        application_spark_ui_url = query_arg.get('application_spark_ui_url', [])
        if application_spark_ui_url:
            application_spark_ui_url = application_spark_ui_url[0]

        model = await self.build_api().sql(
            application_id=application_id,
            application_spark_ui_url=application_spark_ui_url,
            sql_id=pk,
        )

        if include_jobs_and_stages:
            job_ids = (model.failed_job_ids or []) + (
                model.running_job_ids or []) + (model.success_job_ids or [])
            model.jobs = [await self.build_api().job(
                application_id=application_id,
                application_spark_ui_url=application_spark_ui_url,
                job_id=job_id,
            ) for job_id in job_ids]

            stage_ids = reduce(lambda acc, job: acc + (job.stage_ids or []), model.jobs, [])
            model.stages = [await self.build_api().stage(
                application_id=application_id,
                application_spark_ui_url=application_spark_ui_url,
                stage_id=stage_id,
            ) for stage_id in stage_ids]

        return self(
            model,
            user,
            **kwargs,
        )
