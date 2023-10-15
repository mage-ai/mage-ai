from typing import List

from mage_ai.services.spark.api.base import BaseAPI
from mage_ai.services.spark.models.applications import Application
from mage_ai.services.spark.models.jobs import Job
from mage_ai.services.spark.models.stages import Stage, StageAttempt

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
