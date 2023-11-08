import json
import os
from dataclasses import dataclass
from typing import Dict, List

from mage_ai.services.spark.models.base import BaseSparkModel


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
    name: str = None  # my spark app
    spark_ui_url: str = None

    def __post_init__(self):
        if self.attempts and isinstance(self.attempts, list):
            self.attempts = [ApplicationAttempt.load(**m) for m in self.attempts]

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
            application.id: application.to_dict(),
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
                        data[application.id] = application

        return data
