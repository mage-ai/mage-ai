import urllib.parse
from abc import ABC, abstractmethod
from typing import Dict, List

import requests

from mage_ai.data_preparation.repo_manager import RepoConfig
from mage_ai.services.spark.config import SparkConfig
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
from mage_ai.services.spark.spark import get_spark_session
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find


class BaseAPI(ABC):
    def __init__(
        self,
        all_applications: bool = True,
        application_id: str = None,
        application_spark_ui_url: str = None,
        spark_session=None,
    ):
        self.application_id = application_id
        self.spark_session = None

        if spark_session:
            self.spark_session = spark_session
        else:
            repo_config = RepoConfig(repo_path=get_repo_path())
            spark_config = SparkConfig.load(config=repo_config.spark_config)

            try:
                self.spark_session = get_spark_session(spark_config)

                if not self.application_id and self.spark_session:
                    spark_confs = self.spark_session.sparkContext.getConf().getAll()
                    value_tup = find(lambda tup: tup[0] == 'spark.app.id', spark_confs)
                    if value_tup:
                        self.application_id = value_tup[1]
            except ImportError:
                pass

        self.all_applications = all_applications
        self.application_spark_ui_url = application_spark_ui_url
        self._application = None

    @property
    def application(self):
        if self._application:
            return self._application

        self._application = Application.load(
            id=self.application_id,
            spark_ui_url=self.application_spark_ui_url,
        )

        return self._application

    @abstractmethod
    def endpoint(self, **kwargs) -> str:
        pass

    @abstractmethod
    async def applications(self, **kwargs) -> List[Application]:
        pass

    @abstractmethod
    def applications_sync(self, **kwargs) -> List[Application]:
        pass

    @abstractmethod
    async def job(self, job_id: int, application_id: str = None, **kwargs) -> Job:
        pass

    @abstractmethod
    def jobs_sync(self, application_id: str = None, **kwargs) -> List[Job]:
        pass

    @abstractmethod
    async def stages(self, application_id: str = None, query: Dict = None, **kwargs) -> List[Stage]:
        pass

    @abstractmethod
    async def stage(self, stage_id: int, application_id: str = None, **kwargs) -> Stage:
        pass

    @abstractmethod
    async def stage_attempts(
        self,
        stage_id: int,
        application_id: str = None,
        **kwargs,
    ) -> List[StageAttempt]:
        pass

    @abstractmethod
    async def stage_attempt(
        self,
        stage_id: int,
        attempt_id: int,
        application_id: str = None,
        **kwargs,
    ) -> StageAttempt:
        pass

    @abstractmethod
    async def stage_attempt_task_summary(
        self,
        stage_id: int,
        attempt_id: int,
        application_id: str = None,
        **kwargs,
    ) -> StageAttemptTaskSummary:
        pass

    @abstractmethod
    async def stage_attempt_tasks(
        self,
        stage_id: int,
        attempt_id: int,
        application_id: str = None,
        **kwargs,
    ) -> List[Task]:
        pass

    @abstractmethod
    async def executors(self, application_id: str = None, **kwargs) -> List[Executor]:
        pass

    @abstractmethod
    async def threads(self, executor_id: str, application_id: str = None, **kwargs) -> List[Thread]:
        pass

    @abstractmethod
    async def sqls(self, application_id: str = None, query: Dict = None, **kwargs) -> List[Sql]:
        pass

    @abstractmethod
    async def sql(self, sql_id: int, application_id: str = None, **kwargs) -> Sql:
        pass

    @abstractmethod
    async def environment(self, application_id: str = None, **kwargs) -> Environment:
        pass

    def ready_for_requests(self, **kwargs) -> bool:
        return True if self.spark_session else False

    async def get(self, path: str, host: str = None, query: Dict = None):
        if not self.ready_for_requests():
            return {}

        url = f'{self.endpoint(host=host)}{path}'
        response = await self.__build_request(
            'get',
            url,
            query=query,
        )
        if response.status_code == 200:
            return response.json()
        else:
            print(f'[WARNING] {self.__class__.__name__} async {url}: {response}')

        return {}

    def get_sync(self, path: str, host: str = None, query: Dict = None):
        if not self.ready_for_requests():
            return {}

        url = f'{self.endpoint(host=host)}{path}'
        response = self.__build_request_sync('get', url, query=query)
        if response.status_code == 200:
            return response.json()
        else:
            print(f'[WARNING] {self.__class__.__name__} {url}: {response}')

        return {}

    def __build_request_sync(
        self,
        http_method: str,
        url: str,
        headers: Dict = None,
        query: Dict = None,
        payload: Dict = None,
    ):
        session = requests.Session()
        adapter_http = requests.adapters.HTTPAdapter(max_retries=100)
        adapter_https = requests.adapters.HTTPAdapter(max_retries=100)
        session.mount('http://', adapter_http)
        session.mount('https://', adapter_https)

        if query:
            url = f'{url}?{urllib.parse.urlencode(query)}'

        return getattr(session, http_method)(
            url,
            data=payload,
            headers=headers,
            timeout=12,
            verify=False,
        )

    async def __build_request(self, *args, **kwargs):
        return self.__build_request_sync(*args, **kwargs)
