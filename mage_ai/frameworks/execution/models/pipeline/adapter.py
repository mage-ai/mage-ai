from __future__ import annotations

import asyncio
from typing import List, Optional

from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline as PipelineBase
from mage_ai.frameworks.execution.models.block.adapter import Block
from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID
from mage_ai.shared.array import flatten
from mage_ai.shared.models import Delegator


class Pipeline(Delegator):
    def __init__(
        self,
        uuid: str,
        execution_framework: ExecutionFrameworkUUID,
        target: Optional[PipelineBase] = None,
    ):
        self.execution_framework = execution_framework
        self.target = target
        self.uuid = uuid
        self._pipeline = None

    @property
    async def pipeline(self) -> PipelineBase:
        if not self._pipeline:
            self._pipeline = await PipelineBase.get_async(self.uuid, all_projects=True)
        self.target = self._pipeline
        return self._pipeline

    @property
    async def blocks(self) -> List[Block]:
        pipeline = await self.pipeline
        if pipeline and isinstance(pipeline, PipelineBase) and pipeline.blocks_by_uuid:
            return [Block(target=block) for block in pipeline.blocks_by_uuid.values()]
        return []

    @property
    async def pipelines(self) -> List[Pipeline]:
        arr = []
        for block in await self.blocks:
            if BlockType.PIPELINE != block.type:
                continue

            arr.append(
                Pipeline(
                    uuid=block.uuid,
                    execution_framework=self.execution_framework,
                )
            )

        return arr

    async def get_pipelines(self) -> List[Pipeline]:
        arr = await self.pipelines or []
        arr += await asyncio.gather(*[pipeline.get_pipelines() for pipeline in arr])

        return flatten(arr)
