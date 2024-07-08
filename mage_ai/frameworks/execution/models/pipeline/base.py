from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List, Optional

from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.frameworks.execution.models.base import BaseExecutionFramework
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.shared.array import flatten


@dataclass
class PipelineExecutionFramework(BaseExecutionFramework):
    blocks: Optional[List[BlockExecutionFramework]] = None
    pipeline_schedules: Optional[List[Any]] = None
    pipelines: Optional[List[PipelineExecutionFramework]] = None
    type: Optional[PipelineType] = PipelineType.EXECUTION_FRAMEWORK

    def __post_init__(self):
        self.serialize_attribute_classes('blocks', BlockExecutionFramework)
        self.serialize_attribute_classes('pipelines', PipelineExecutionFramework)
        self.serialize_attribute_enum('type', PipelineType)

    def get_pipelines(self, level: Optional[int] = None) -> List[PipelineExecutionFramework]:
        arr = []
        if level is None or level >= 1:
            arr += self.pipelines or []
            if (level is None or level >= 2) and self.pipelines:
                arr += flatten([
                    framework.get_pipelines(level=level) for framework in self.pipelines
                ])
        return arr
