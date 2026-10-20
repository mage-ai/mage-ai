from __future__ import annotations

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
    directories: Optional[List[str]] = None
    memory: Optional[List[MemoryUsage]] = None
    memory_usage: Optional[int] = None
    path: Optional[str] = None
    paths: Optional[List[str]] = None
    size: Optional[int] = None

    @classmethod
    def combine(cls, resource_usages: List['ResourceUsage']):
        resource_usage_combined = cls.load()

        for resource_usage in resource_usages:
            if resource_usage.memory_usage:
                resource_usage_combined.memory_usage = resource_usage_combined.memory_usage or 0
                resource_usage_combined.memory_usage += resource_usage.memory_usage
            if resource_usage.size:
                resource_usage_combined.size = resource_usage_combined.size or 0
                resource_usage_combined.size += resource_usage.size
            if resource_usage.directories:
                resource_usage_combined.directories = resource_usage_combined.directories or []
                resource_usage_combined.directories.extend(resource_usage.directories)
                if resource_usage_combined.directories:
                    resource_usage_combined.directory = resource_usage_combined.paths[-1]
            if resource_usage.paths:
                resource_usage_combined.paths = resource_usage_combined.paths or []
                resource_usage_combined.paths.extend(resource_usage.paths)
                if resource_usage_combined.paths:
                    resource_usage_combined.path = resource_usage_combined.paths[-1]

        return resource_usage_combined

    def __post_init__(self):
        self.serialize_attribute_classes('memory', MemoryUsage)

        if self.memory:
            memory_sorted = sorted(self.memory or [], key=lambda x: x.timestamp, reverse=True)
            if len(memory_sorted) >= 1:
                self.memory_usage = memory_sorted[0].rss - memory_sorted[-1].rss
