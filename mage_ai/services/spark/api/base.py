from abc import ABC, abstractmethod
from typing import Dict, List

import requests

from mage_ai.services.spark.models import Application, Job


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
