from typing import Dict, List

from mage_ai.services.spark.api.base import BaseAPI
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

API_VERSION = 'v1'
SPARK_UI_HOST = 'localhost'
SPARK_UI_PORT = '4040'


class LocalAPI(BaseAPI):
    @property
    def spark_ui_url(self) -> str:
        url = f'http://{SPARK_UI_HOST}:{SPARK_UI_PORT}'

        if self.spark_session:
            url = self.spark_session.sparkContext.uiWebUrl

        return url

    @property
    def endpoint(self) -> str:
        return f'{self.spark_ui_url}/api/{API_VERSION}'

    def applications_sync(self, **kwargs) -> List[Application]:
        models = self.get_sync('/applications')
        return [Application.load(**model) for model in models]

    def jobs_sync(self, application_id: str = None, **kwargs) -> List[Job]:
        models = self.get_sync(f'/applications/{self.application_id or application_id}/jobs')
        return [Job.load(**model) for model in models]

    def sqls_sync(self, application_id: str = None, query: Dict = None, **kwargs) -> List[Sql]:
        models = self.get_sync(
            f'/applications/{self.application_id or application_id}/sql', query=query,
        )
        return sorted(
            [Sql.load(**model) for model in models],
            key=lambda s: s.submission_time,
            reverse=True,
        )

    def stages_sync(self, application_id: str = None, query: Dict = None, **kwargs) -> List[Stage]:
        models = self.get_sync(
            f'/applications/{self.application_id or application_id}/stages', query=query,
        )
        model_class = StageAttempt if query and query.get('details') else Stage
        return [model_class.load(**model) for model in models]

    async def applications(self, **kwargs) -> List[Application]:
        models = await self.get('/applications')
        return [Application.load(**model, spark_ui_url=self.spark_ui_url) for model in models]

    async def jobs(self, application_id: str = None, **kwargs) -> List[Job]:
        models = await self.get(f'/applications/{self.application_id or application_id}/jobs')
        return [Job.load(**model) for model in models]

    async def job(self, job_id: int, application_id: str = None, **kwargs) -> Job:
        model = await self.get(
            f'/applications/{self.application_id or application_id}/jobs/{job_id}',
        )
        return Job.load(**model)

    async def stages(self, application_id: str = None, query: Dict = None, **kwargs) -> List[Stage]:
        models = await self.get(
            f'/applications/{self.application_id or application_id}/stages', query=query,
        )
        model_class = StageAttempt if query and query.get('details') else Stage
        return [model_class.load(**model) for model in models]

    async def stage(
        self,
        stage_id: int,
        application_id: str = None,
        query: Dict = None,
        **kwargs,
    ) -> Stage:
        stage_attempts = await self.get(
            f'/applications/{self.application_id or application_id}/stages/{stage_id}',
            query=query,
        )
        return Stage.load(stage_attempts=stage_attempts, stage_id=stage_id)

    async def stage_attempts(
        self,
        stage_id: int,
        application_id: str = None,
        **kwargs,
    ) -> List[StageAttempt]:
        models = await self.get(
            f'/applications/{self.application_id or application_id}/stages/{stage_id}',
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
            f'/applications/{self.application_id or application_id}/stages/{stage_id}/{attempt_id}',
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
            f'/applications/{self.application_id or application_id}'
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
            f'/applications/{self.application_id or application_id}'
            f'/stages/{stage_id}/{attempt_id}/taskList',
        )
        return [Task.load(**model) for model in models]

    async def executors(self, application_id: str = None, **kwargs) -> List[Executor]:
        models = await self.get(
            f'/applications/{self.application_id or application_id}/allexecutors',
        )
        return [Executor.load(**model) for model in models]

    async def threads(self, executor_id: str, application_id: str = None, **kwargs) -> List[Thread]:
        models = await self.get(
            f'/applications/{self.application_id or application_id}'
            f'/executors/{executor_id}/threads',
        )
        return [Thread.load(**model) for model in models]

    async def sqls(self, application_id: str = None, query: Dict = None, **kwargs) -> List[Sql]:
        models = await self.get(
            f'/applications/{self.application_id or application_id}/sql', query=query,
        )
        return sorted(
            [Sql.load(**model) for model in models],
            key=lambda s: s.submission_time,
            reverse=True,
        )

    async def sql(self, sql_id: int, application_id: str = None, **kwargs) -> Sql:
        model = await self.get(
            f'/applications/{self.application_id or application_id}/sql/{sql_id}',
        )
        return Sql.load(**model)

    async def environment(self, application_id: str = None, **kwargs) -> Environment:
        model = await self.get(
            f'/applications/{self.application_id or application_id}/environment',
        )
        return Environment.load(**model)
