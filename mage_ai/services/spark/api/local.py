from typing import List

from mage_ai.services.spark.api.base import BaseAPI
from mage_ai.services.spark.models import Application, Job

API_VERSION = 'v1'
SPARK_UI_HOST = 'localhost'
SPARK_UI_PORT = '4040'


class LocalAPI(BaseAPI):
    @property
    def endpoint(self) -> str:
        return f'http://{SPARK_UI_HOST}:{SPARK_UI_PORT}/api/{API_VERSION}'

    async def applications(self, **kwargs) -> List[Application]:
        models = await self.get('/applications')
        return [Application.load(**data) for data in models]

    async def jobs(self, application_id: str, **kwargs) -> List[Job]:
        models = await self.get(f'/applications/{application_id}/jobs')
        return [Job.load(**data) for data in models]

    async def job(self, application_id: str, job_id: int, **kwargs) -> Job:
        model = await self.get(f'/applications/{application_id}/jobs/{job_id}')
        return Job.load(**model)
