from abc import ABC, abstractmethod
from typing import Dict, List

import requests

from mage_ai.services.spark.models.applications import Application
from mage_ai.services.spark.models.jobs import Job
from mage_ai.services.spark.models.stages import Stage, StageAttempt


class BaseAPI(ABC):
    @property
    @abstractmethod
    def endpoint(self) -> str:
        pass

    @abstractmethod
    async def applications(self, **kwargs) -> List[Application]:
        pass

    @abstractmethod
    async def jobs(self, application_id: str, **kwargs) -> List[Job]:
        pass

    @abstractmethod
    async def job(self, application_id: str, job_id: int, **kwargs) -> Job:
        pass

    @abstractmethod
    async def stages(self, application_id: str, **kwargs) -> List[Stage]:
        pass

    @abstractmethod
    async def stage_attempts(
        self,
        application_id: str,
        stage_id: int,
        **kwargs,
    ) -> List[StageAttempt]:
        pass

    @abstractmethod
    async def stage_attempt(
        self,
        application_id: str,
        stage_id: int,
        attempt_id: int,
        **kwargs,
    ) -> StageAttempt:
        pass

    async def get(self, path: str):
        response = await self.__build_request('get', f'{self.endpoint}{path}')
        return response.json()

    async def __build_request(
        self,
        http_method: str,
        url: str,
        headers: Dict = None,
        payload: Dict = None,
    ):
        session = requests.Session()
        adapter_http = requests.adapters.HTTPAdapter(max_retries=100)
        adapter_https = requests.adapters.HTTPAdapter(max_retries=100)
        session.mount('http://', adapter_http)
        session.mount('https://', adapter_https)

        return getattr(session, http_method)(
            url,
            data=payload,
            headers=headers,
            timeout=12,
            verify=False,
        )
