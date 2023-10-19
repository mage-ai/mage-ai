from dataclasses import dataclass
from typing import List

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

    def __post_init__(self):
        if self.attempts and isinstance(self.attempts, list):
            self.attempts = [ApplicationAttempt.load(**m) for m in self.attempts]
