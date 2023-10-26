from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List

from mage_ai.services.spark.models.base import BaseSparkModel


class JobStatus(str, Enum):
    FAILED = 'FAILED'
    SUCCEEDED = 'SUCCEEDED'


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
    status: str = JobStatus  # SUCCEEDED
    submission_time: str = None  # 2023-10-15T10:17:00.758GMT

    def __post_init__(self):
        if self.status:
            try:
                self.status = JobStatus(self.status)
            except ValueError as err:
                print(f'[WARNING] Job: {err}')
                self.status = self.status

    @property
    def id(self) -> int:
        return self.job_id
