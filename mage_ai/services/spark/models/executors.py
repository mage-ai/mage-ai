from dataclasses import dataclass, field
from typing import Dict, List

from mage_ai.services.spark.models.base import BaseSparkModel
from mage_ai.services.spark.models.metrics import MemoryMetrics, Metrics


@dataclass
class Executor(BaseSparkModel):
    active_tasks: int = None  # 0
    add_time: str = None  # "2023-10-15T16:32:44.637GMT"
    attributes: Dict = field(default_factory=dict)  # { }
    blacklisted_in_stages: int = None  # [ ]
    completed_tasks: int = None  # 28
    disk_used: int = None  # 0
    excluded_in_stages: List = field(default_factory=list)  # []
    executor_logs: Dict = field(default_factory=dict)  # { }
    failed_tasks: int = None  # 0
    host_port: str = None  # "0748f2b43787:45257"
    id: str = None  # "driver"
    is_active: bool = None  # true
    is_blacklisted: bool = None  # false
    is_excluded: bool = None  # false
    max_memory: int = None  # 455501414
    max_tasks: int = None  # 1
    memory_metrics: MemoryMetrics = None
    memory_used: int = None  # 983495
    peak_memory_metrics: Metrics = None  # {}
    rdd_blocks: int = None  # 0
    resource_profile_id: int = None  # 0
    resources: Dict = field(default_factory=dict)  # { }
    total_cores: int = None  # 1
    total_duration: int = None  # 1221199
    total_gc_time: int = None  # 136
    total_input_bytes: int = None  # 0
    total_shuffle_read: int = None  # 1321032
    total_shuffle_write: int = None  # 1372831
    total_tasks: int = None  # 28

    def __post_init__(self):
        if self.memory_metrics and isinstance(self.memory_metrics, dict):
            self.memory_metrics = MemoryMetrics.load(**self.memory_metrics)

        if self.peak_memory_metrics and isinstance(self.peak_memory_metrics, dict):
            self.peak_memory_metrics = Metrics.load(**self.peak_memory_metrics)
