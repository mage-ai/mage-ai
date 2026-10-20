from typing import Dict, List

from mage_ai.services.spark.api.base import BaseAPI
from mage_ai.services.spark.api.constants import (
    SPARK_UI_API_VERSION,
    SPARK_UI_HOST,
    SPARK_UI_PORT,
)
from mage_ai.services.spark.models.applications import Application
from mage_ai.services.spark.models.environments import Environment
from mage_ai.services.spark.models.executors import Executor
from mage_ai.services.spark.models.jobs import Job
from mage_ai.services.spark.models.sqls import Sql
from mage_ai.services.spark.models.stages import (
    Stage,
    StageAttempt,
    StageAttemptTaskSummary,
    Task,
)
from mage_ai.services.spark.models.threads import Thread
from mage_ai.shared.hash import index_by


class LocalAPI(BaseAPI):
    @property
    def spark_ui_url(self) -> str:
        url = f'http://{SPARK_UI_HOST}:{SPARK_UI_PORT}'

        if self.application_spark_ui_url:
            url = self.application_spark_ui_url
        elif self.spark_session:
            url = self.spark_session.sparkContext.uiWebUrl

        return url

    def endpoint(self, host: str = None, **kwargs) -> str:
        return f'{host or self.spark_ui_url}/api/{SPARK_UI_API_VERSION}'

    def applications_sync(self, **kwargs) -> List[Application]:
        models = self.get_sync('/applications')
        applications = [Application.load(
            **model,
            spark_ui_url=self.spark_ui_url,
        ) for model in models]
        mapping = index_by(lambda x: x.id, applications)

        applications_cache = Application.get_applications_from_cache()
        if applications_cache:
            for application in applications_cache.values():
                if application.calculated_id() in mapping:
                    continue
                applications.append(application)
                mapping[application.calculated_id()] = application

        return applications

    def jobs_sync(self, application_id: str = None, **kwargs) -> List[Job]:
        application_id = application_id or self.application_id
        models = self.get_sync(f'/applications/{application_id}/jobs')

        arr = []
        if self.all_applications:
            applications = self.applications_sync(**kwargs)
        else:
            applications = [self.application]

        for application in applications:
            if application.calculated_id() == application_id:
                arr.extend([Job.load(application=application, **model) for model in models])
            else:
                jobs = self.get_sync(
                    f'/applications/{application.calculated_id()}/jobs',
                    host=application.spark_ui_url,
                )
                arr.extend([Job.load(application=application, **model) for model in jobs])

        return arr

    def sqls_sync(self, application_id: str = None, query: Dict = None, **kwargs) -> List[Sql]:
        application_id = application_id or self.application_id
        models = self.get_sync(
            f'/applications/{application_id}/sql',
            query=query,
        )

        arr = []
        if self.all_applications:
            applications = self.applications_sync(**kwargs)
        else:
            applications = [self.application]

        for application in applications:
            if application.calculated_id() == application_id:
                arr.extend(sorted(
                    [Sql.load(
                        application=application,
                        **model,
                    ) for model in models],
                    key=lambda s: s.submission_time,
                    reverse=True,
                ))
            else:
                models2 = self.get_sync(
                    f'/applications/{application.calculated_id()}/sql',
                    host=application.spark_ui_url,
                    query=query,
                )
                arr.extend(sorted(
                    [Sql.load(
                        application=application,
                        **model,
                    ) for model in models2],
                    key=lambda s: s.submission_time,
                    reverse=True,
                ))

        return arr

    def stages_sync(self, application_id: str = None, query: Dict = None, **kwargs) -> List[Stage]:
        application_id = application_id or self.application_id
        models = self.get_sync(
            f'/applications/{application_id or self.application_id}/stages', query=query,
        )
        model_class = StageAttempt if query and query.get('details') else Stage

        arr = []
        if self.all_applications:
            applications = self.applications_sync(**kwargs)
        else:
            applications = [self.application]

        for application in applications:
            if application.calculated_id() == application_id:
                arr.extend([model_class.load(
                    application=application,
                    **model,
                ) for model in models])
            else:
                models2 = self.get_sync(
                    f'/applications/{application.calculated_id()}/stages',
                    host=application.spark_ui_url,
                    query=query,
                )
                arr.extend([model_class.load(
                    application=application,
                    **model,
                ) for model in models2])

        return arr

    async def applications(self, **kwargs) -> List[Application]:
        models = await self.get('/applications')
        applications = [Application.load(
            **model,
            spark_ui_url=self.spark_ui_url,
        ) for model in models]
        mapping = index_by(lambda x: x.id, applications)

        applications_cache = Application.get_applications_from_cache()
        if applications_cache:
            for application in applications_cache.values():
                if application.calculated_id() in mapping:
                    continue
                applications.append(application)
                mapping[application.calculated_id()] = application

        return applications

    async def jobs(self, application_id: str = None, **kwargs) -> List[Job]:
        application_id = application_id or self.application_id
        models = await self.get(f'/applications/{application_id}/jobs')

        arr = []
        if self.all_applications:
            applications = await self.applications(**kwargs)
        else:
            applications = [self.application]

        for application in applications:
            if application.calculated_id() == application_id:
                arr.extend([Job.load(application=application, **model) for model in models])
            else:
                jobs = await self.get(
                    f'/applications/{application.calculated_id()}/jobs',
                    host=application.spark_ui_url,
                )
                arr.extend([Job.load(application=application, **model) for model in jobs])

        return arr

    async def job(
        self,
        job_id: int,
        application_id: str = None,
        application_spark_ui_url: str = None,
        **kwargs,
    ) -> Job:
        application_id = application_id or self.application_id
        model = await self.get(
            f'/applications/{application_id}/jobs/{job_id}',
            host=application_spark_ui_url,
        )
        return Job.load(
            application=Application.load(
                id=application_id,
                spark_ui_url=application_spark_ui_url,
            ),
            **model,
        )

    async def stages(self, application_id: str = None, query: Dict = None, **kwargs) -> List[Stage]:
        application_id = application_id or self.application_id
        models = await self.get(
            f'/applications/{application_id or self.application_id}/stages', query=query,
        )
        model_class = StageAttempt if query and query.get('details') else Stage

        arr = []
        if self.all_applications:
            applications = await self.applications(**kwargs)
        else:
            applications = [self.application]

        for application in applications:
            if application.calculated_id() == application_id:
                arr.extend([model_class.load(
                    application=application,
                    **model,
                ) for model in models])
            else:
                models2 = await self.get(
                    f'/applications/{application.calculated_id()}/stages',
                    host=application.spark_ui_url,
                    query=query,
                )
                arr.extend([model_class.load(
                    application=application,
                    **model,
                ) for model in models2])

        return arr

    async def stage(
        self,
        stage_id: int,
        application_id: str = None,
        application_spark_ui_url: str = None,
        query: Dict = None,
        **kwargs,
    ) -> Stage:
        application_id = application_id or self.application_id
        stage_attempts = await self.get(
            f'/applications/{application_id}/stages/{stage_id}',
            host=application_spark_ui_url,
            query=query,
        )
        return Stage.load(
            application=Application.load(
                id=application_id,
                spark_ui_url=application_spark_ui_url,
            ),
            stage_attempts=stage_attempts,
            stage_id=stage_id,
        )

    async def stage_attempts(
        self,
        stage_id: int,
        application_id: str = None,
        **kwargs,
    ) -> List[StageAttempt]:
        models = await self.get(
            f'/applications/{application_id or self.application_id}/stages/{stage_id}',
        )
        return [StageAttempt.load(**model) for model in models]

    async def stage_attempt(
        self,
        stage_id: int,
        attempt_id: int,
        application_id: str = None,
        **kwargs,
    ) -> StageAttempt:
        model = await self.get(
            f'/applications/{application_id or self.application_id}/stages/{stage_id}/{attempt_id}',
        )
        return StageAttempt.load(**model)

    async def stage_attempt_task_summary(
        self,
        stage_id: int,
        attempt_id: int,
        application_id: str = None,
        **kwargs,
    ) -> StageAttemptTaskSummary:
        model = await self.get(
            f'/applications/{application_id or self.application_id}'
            f'/stages/{stage_id}/{attempt_id}/taskSummary',
        )
        return StageAttemptTaskSummary.load(**model)

    async def stage_attempt_tasks(
        self,
        stage_id: int,
        attempt_id: int,
        application_id: str = None,
        **kwargs,
    ) -> List[Task]:
        models = await self.get(
            f'/applications/{application_id or self.application_id}'
            f'/stages/{stage_id}/{attempt_id}/taskList',
        )
        return [Task.load(**model) for model in models]

    async def executors(self, application_id: str = None, **kwargs) -> List[Executor]:
        models = await self.get(
            f'/applications/{application_id or self.application_id}/allexecutors',
        )
        return [Executor.load(**model) for model in models]

    async def threads(self, executor_id: str, application_id: str = None, **kwargs) -> List[Thread]:
        models = await self.get(
            f'/applications/{application_id or self.application_id}'
            f'/executors/{executor_id}/threads',
        )
        return [Thread.load(**model) for model in models]

    async def sqls(
        self,
        application_id: str = None,
        application_spark_ui_url: str = None,
        query: Dict = None,
        **kwargs,
    ) -> List[Sql]:
        application_id = application_id or self.application_id
        models = await self.get(
            f'/applications/{application_id}/sql',
            query=query,
        )

        arr = []
        if self.all_applications:
            applications = await self.applications(**kwargs)
        else:
            applications = [self.application]

        for application in applications:
            if application.calculated_id() == application_id:
                arr.extend(sorted(
                    [Sql.load(
                        application=application,
                        **model,
                    ) for model in models],
                    key=lambda s: s.submission_time,
                    reverse=True,
                ))
            else:
                models2 = await self.get(
                    f'/applications/{application.calculated_id()}/sql',
                    host=application.spark_ui_url,
                    query=query,
                )
                arr.extend(sorted(
                    [Sql.load(
                        application=application,
                        **model,
                    ) for model in models2],
                    key=lambda s: s.submission_time,
                    reverse=True,
                ))

        return arr

    async def sql(
        self,
        sql_id: int,
        application_id: str = None,
        application_spark_ui_url: str = None,
        **kwargs,
    ) -> Sql:
        application_id = application_id or self.application_id
        model = await self.get(
            f'/applications/{application_id}/sql/{sql_id}',
            host=application_spark_ui_url,
        )
        return Sql.load(
            application=Application.load(
                id=application_id,
                spark_ui_url=application_spark_ui_url,
            ),
            **model,
        )

    async def environment(self, application_id: str = None, **kwargs) -> Environment:
        model = await self.get(
            f'/applications/{application_id or self.application_id}/environment',
        )
        return Environment.load(**model)
