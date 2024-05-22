from dataclasses import dataclass
from typing import List, Optional

from mage_ai.shared.models import BaseDataClass


@dataclass
class MemoryUsage(BaseDataClass):
    timestamp: int
    pageins: Optional[int] = None
    pfaults: Optional[int] = None
    rss: Optional[int] = None
    vms: Optional[int] = None


@dataclass
class ResourceUsage(BaseDataClass):
    directory: Optional[str] = None
    memory: Optional[List[MemoryUsage]] = None
    path: Optional[str] = None
    size: Optional[int] = None

    def __post_init__(self):
        self.serialize_attribute_classes('memory', MemoryUsage)

    def memory_usage(self) -> int:
        memory_sorted = sorted(self.memory or [], key=lambda x: x.timestamp, reverse=True)
        if len(memory_sorted) == 0:
            return 0

        return memory_sorted[0].rss or 0
