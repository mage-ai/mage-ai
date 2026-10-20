import json
import os
import urllib.parse
from dataclasses import dataclass
from typing import Dict, List

from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.services.spark.models.base import BaseSparkModel
from mage_ai.services.spark.utils import get_compute_service
from mage_ai.shared.hash import merge_dict


@dataclass
class ApplicationAttempt(BaseSparkModel):
    app_spark_version: str = None  # 3.5.0
    completed: bool = None  # False
    duration: int = None  # 3498195
    end_time: str = None  # 1969-12-31T23:59:59.999GMT
    end_time_epoch: int = None  # -1
    last_updated: str = None  # 2023-10-15T09:03:30.699GMT
    last_updated_epoch: int = None  # 1697360610699
    spark_user: str = None  # root
    start_time: str = None  # 2023-10-15T09:03:30.699GMT
    start_time_epoch: int = None  # 1697360610699


@dataclass
class Application(BaseSparkModel):
    id: str  # local-1697360611228
    attempts: List[ApplicationAttempt] = None
    attempts_count: int = None
    name: str = None  # my spark app
    spark_ui_url: str = None

    def __post_init__(self):
        if self.attempts and isinstance(self.attempts, list):
            arr = []
            for m in self.attempts:
                if m and isinstance(m, dict):
                    arr.append(ApplicationAttempt.load(**m))
                else:
                    arr.append(m)
            self.attempts = arr

    @classmethod
    def load(self, **kwargs):
        payload = kwargs.copy() if kwargs else {}

        if ComputeServiceUUID.AWS_EMR == get_compute_service(ignore_active_kernel=True):
            if payload.get('id'):
                parts = urllib.parse.unquote(payload.get('id')).split('/')
                if len(parts) >= 2:
                    payload['id'] = parts[0]
                    payload['attempts_count'] = parts[1]

        return super().load(**payload)

    @classmethod
    def __cache_file_path(self):
        return os.path.join(self.cache_dir_path(), 'applications.json')

    @classmethod
    def clear_cache(self) -> None:
        if os.path.exists(self.__cache_file_path()):
            os.remove(self.__cache_file_path())

    @classmethod
    def cache_application(self, application) -> None:
        os.makedirs(self.cache_dir_path(), exist_ok=True)

        data = {}
        if os.path.exists(self.__cache_file_path()):
            with open(self.__cache_file_path()) as f:
                content = f.read()
                if content:
                    data.update(json.loads(content) or {})

        data.update({
            application.calculated_id(): application.to_dict(),
        })

        with open(self.__cache_file_path(), 'w') as f:
            f.write(json.dumps(data))

    @classmethod
    def get_applications_from_cache(self) -> Dict:
        data = {}

        if os.path.exists(self.__cache_file_path()):
            with open(self.__cache_file_path()) as f:
                content = f.read()
                if content:
                    for application_dict in json.loads(content).values():
                        application = self.load(**application_dict)
                        data[application.calculated_id()] = application

        return data

    def calculated_id(self) -> str:
        if ComputeServiceUUID.AWS_EMR == get_compute_service(ignore_active_kernel=True):
            count = 1
            if self.attempts:
                count = len(self.attempts)
            elif self.attempts_count is not None:
                count = self.attempts_count

            return f'{self.id}/{count}'

        return self.id

    def to_dict(self, **kwargs) -> Dict:
        return merge_dict(
            super().to_dict(**kwargs),
            dict(calculated_id=self.calculated_id()),
        )
