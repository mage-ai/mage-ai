from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import List, Optional

from mage_ai.data_preparation.models.constants import BlockType, PipelineType
from mage_ai.frameworks.execution.models.base import BaseExecutionFramework
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.shared.array import flatten


@dataclass
class PipelineExecutionFramework(BaseExecutionFramework):
    blocks: Optional[List[BlockExecutionFramework]] = None
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

    def flatten_block_groups(self):
        flatten_block_groups = []
        pipelines_queue = deque()
        pipelines_queue.append(self)
        while pipelines_queue:
            pipeline = pipelines_queue.pop()
            for b in pipeline.blocks:
                if b.type == BlockType.GROUP:
                    flatten_block_groups.append(b)
            if pipeline.pipelines:
                for child_pipeline in pipeline.pipelines:
                    pipelines_queue.append(child_pipeline)
        return flatten_block_groups

    def set_block_dependency(self, blocks_by_uuid):
        """
        1. Construct a map of blocks by group
        2. Construct a map of block execution framework group to block execution framework
        """
        blocks_by_group = {b.groups[0]: b for b in blocks_by_uuid.values() if b.groups}

        flatten_block_groups = self.flatten_block_groups()
        flatten_block_groups_by_uuid = {b.uuid: b for b in flatten_block_groups}

        for b in blocks_by_group.values():
            block_group = flatten_block_groups_by_uuid.get(b.groups[0])
            if not block_group:
                continue
            if block_group.upstream_blocks:
                b.upstream_blocks = [
                    blocks_by_group[guuid]
                    for guuid in block_group.upstream_blocks
                    if guuid in blocks_by_group
                ]

            if block_group.downstream_blocks:
                b.downstream_blockse = [
                    blocks_by_group[guuid]
                    for guuid in block_group.downstream_blocks
                    if guuid in blocks_by_group
                ]
