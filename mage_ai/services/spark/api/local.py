from typing import List

import requests

from mage_ai.services.spark.api.base import BaseAPI
from mage_ai.services.spark.models import Application

API_VERSION = 'v1'
SPARK_UI_HOST = 'localhost'
SPARK_UI_PORT = '4040'


class LocalAPI(BaseAPI):
    @property
    def endpoint(self) -> str:
        return f'http://{SPARK_UI_HOST}:{SPARK_UI_PORT}/api/{API_VERSION}'

    def __build_request(self, http_method: str, url: str):
        s = requests.Session()
        a = requests.adapters.HTTPAdapter(max_retries=100)
        b = requests.adapters.HTTPAdapter(max_retries=100)
        s.mount('http://', a)
        s.mount('https://', b)

        return getattr(s, http_method)(
            url,
            # data=payload,
            # headers=headers,
            timeout=12,
            verify=False,
        )

    def get(self, path: str):
        return self.__build_request('get', f'{self.endpoint}{path}').json()

    def applications(self, **kwargs) -> List[Application]:
        return [Application.load(**data).to_dict() for data in self.get('/applications')]
