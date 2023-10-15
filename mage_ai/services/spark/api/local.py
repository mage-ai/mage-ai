from typing import List

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
    def endpoint(self) -> str:
        return f'http://{SPARK_UI_HOST}:{SPARK_UI_PORT}/api/{API_VERSION}'

    async def applications(self, **kwargs) -> List[Application]:
        models = await self.get('/applications')
        return [Application.load(**model) for model in models]

    async def jobs(self, application_id: str, **kwargs) -> List[Job]:
        models = await self.get(f'/applications/{application_id}/jobs')
        return [Job.load(**model) for model in models]

    async def job(self, application_id: str, job_id: int, **kwargs) -> Job:
        model = await self.get(f'/applications/{application_id}/jobs/{job_id}')
        return Job.load(**model)

    async def stages(self, application_id: str, **kwargs) -> List[Stage]:
        models = await self.get(f'/applications/{application_id}/stages')
        return [Stage.load(**model) for model in models]

    async def stage_attempts(
        self,
        application_id: str,
        stage_id: int,
        **kwargs,
    ) -> List[StageAttempt]:
        models = await self.get(f'/applications/{application_id}/stages/{stage_id}')
        return [StageAttempt.load(**model) for model in models]

    async def stage_attempt(
        self,
        application_id: str,
        stage_id: int,
        attempt_id: int,
        **kwargs,
    ) -> StageAttempt:
        model = await self.get(f'/applications/{application_id}/stages/{stage_id}/{attempt_id}')
        return StageAttempt.load(**model)

    async def stage_attempt_task_summary(
        self,
        application_id: str,
        stage_id: int,
        attempt_id: int,
        **kwargs,
    ) -> StageAttemptTaskSummary:
        model = await self.get(
            f'/applications/{application_id}/stages/{stage_id}/{attempt_id}/taskSummary',
        )
        return StageAttemptTaskSummary.load(**model)

    async def stage_attempt_tasks(
        self,
        application_id: str,
        stage_id: int,
        attempt_id: int,
        **kwargs,
    ) -> List[Task]:
        models = await self.get(
            f'/applications/{application_id}/stages/{stage_id}/{attempt_id}/taskList',
        )
        return [Task.load(**model) for model in models]

    async def executors(self, application_id: str, **kwargs) -> List[Executor]:
        models = await self.get(f'/applications/{application_id}/allexecutors')
        return [Executor.load(**model) for model in models]

    async def threads(self, application_id: str, executor_id: str, **kwargs) -> List[Thread]:
        models = await self.get(
            f'/applications/{application_id}/executors/{executor_id}/threads',
        )
        return [Thread.load(**model) for model in models]

    async def sqls(self, application_id: str, **kwargs) -> List[Sql]:
        models = await self.get(f'/applications/{application_id}/sql')
        return [Sql.load(**model) for model in models]

    async def sql(self, application_id: str, sql_id: int, **kwargs) -> Sql:
        model = await self.get(f'/applications/{application_id}/sql/{sql_id}')
        return Sql.load(**model)

    async def environment(self, application_id: str, **kwargs) -> Environment:
        model = await self.get(f'/applications/{application_id}/environment')
        return Environment.load(**model)
