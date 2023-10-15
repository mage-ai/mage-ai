from dataclasses import asdict, dataclass, field
from typing import Dict, List

import inflection


@dataclass
class BaseSparkModel:
    @classmethod
    def load(self, **kwargs):
        return self(**self.load_to_dict(**kwargs))

    @classmethod
    def load_to_dict(self, **kwargs) -> Dict:
        data = {}
        for key, value in kwargs.items():
            data[inflection.underscore(key)] = value
        return data

    def to_dict(self) -> Dict:
        return asdict(self)


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
    name: str  # # my spark app
    attempts: List[ApplicationAttempt]

    def __post_init__(self):
        if self.attempts and isinstance(self.attempts, list):
            self.attempts = [ApplicationAttempt.load(**m) for m in self.attempts]


@dataclass
class Job(BaseSparkModel):
    completion_time: str = None  # 2023-10-15T10:17:00.772GMT
    job_id: str = None  # 54
    job_tags: List[str] = field(default_factory=list)
    killed_tasks_summary: Dict = field(default_factory=dict)
    name: str = None  # count at NativeMethodAccessorImpl.java:0
    num_active_stages: int = None
    num_active_tasks: int = None
    num_completed_indices: int = None  # 1
    num_completed_stages: int = None  # 1
    num_completed_tasks: int = None  # 1
    num_failed_stages: int = None
    num_failed_tasks: int = None
    num_killed_tasks: int = None
    num_skipped_stages: int = None  # 2
    num_skipped_tasks: int = None  # 2
    num_tasks: int = None  # 3
    stage_ids: List[int] = field(default_factory=list)  # [81, 82, 80]
    status: str = None  # SUCCEEDED
    submission_time: str = None  # 2023-10-15T10:17:00.758GMT
