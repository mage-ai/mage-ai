from dataclasses import asdict, dataclass
from typing import List

import inflection


@dataclass
class BaseSparkModel:
    @classmethod
    def load(self, **kwargs):
        data = {}
        for key, value in kwargs.items():
            data[inflection.underscore(key)] = value
        return self(**data)

    def to_dict(self):
        return asdict(self)


@dataclass
class ApplicationAttempt(BaseSparkModel):
    # 2023-10-15T09:03:30.699GMT
    start_time: str = None
    # 1969-12-31T23:59:59.999GMT
    end_time: str = None
    # 2023-10-15T09:03:30.699GMT
    last_updated: str = None
    # 3498195
    duration: int = None
    # root
    spark_user: str = None
    # False
    completed: bool = None
    # 3.5.0
    app_spark_version: str = None
    # 1697360610699
    start_time_epoch: int = None
    # -1
    end_time_epoch: int = None
    # 1697360610699
    last_updated_epoch: int = None


@dataclass
class Application(BaseSparkModel):
    # local-1697360611228
    id: str
    # my spark app
    name: str
    attempts: List[ApplicationAttempt]

    def __post_init__(self):
        if self.attempts and isinstance(self.attempts, list):
            self.attempts = [ApplicationAttempt.load(**m) for m in self.attempts]
