from __future__ import annotations

from typing import Any, Dict, Optional

from mage_ai.data_preparation.models.block import Block as BlockBase
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline as PipelineBase
from mage_ai.shared.hash import ignore_keys
from mage_ai.shared.models import DelegatorTarget


class Block(DelegatorTarget):
    def __init__(
        self,
        block: BlockBase,
        pipeline: Optional[PipelineBase] = None,
    ):
        super().__init__(block)
        self.block = block
        self.pipeline_child = pipeline

    @classmethod
    async def create(cls, uuid: str, pipeline: Any, payload: Dict[str, Any]) -> Block:
        block_base = BlockBase.create(
            payload.get('name') or uuid,
            block_type=payload['type'],
            repo_path=pipeline.repo_path,
            pipeline=pipeline,
            **ignore_keys(
                payload,
                [
                    'name',
                    'type',
                    'uuid',
                ],
            ),
        )
        block = cls(block=block_base)

        if BlockType.PIPELINE == block.type:
            await block.create_pipeline_child()

        await pipeline.add_block(block)

        return block

    async def create_pipeline_child(self):
        self.pipeline_child = PipelineBase.create(self.name or self.uuid, self.repo_path)
