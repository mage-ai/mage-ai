from __future__ import annotations

from typing import Any, Dict, Optional

from mage_ai.data_preparation.models.block import Block as BlockBase
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline as PipelineBase
from mage_ai.frameworks.execution.models.block.models import Configuration
from mage_ai.shared.hash import extract
from mage_ai.shared.models import DelegatorTarget
from mage_ai.shared.utils import get_absolute_path
from mage_ai.system.browser.models import Item


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
    def preprocess_config(cls, uuid: str, pipeline: Any, payload: Dict[str, Any]) -> Dict:
        configuration_payload = payload.get('configuration', {})

        if 'templates' in configuration_payload:
            for template_uuid, temp_config in configuration_payload.get('templates', {}).items():
                if 'uuid' not in temp_config:
                    continue
                configuration = Configuration.load(**configuration_payload)

                if configuration and configuration.templates:
                    template = configuration.templates[template_uuid]
                    if template:
                        payload.update(template.setup_block_config(payload))

        if not payload.get('type'):
            raise Exception('Block type is required')

        upstream_block_uuids = []
        if 'upstream_blocks' in payload:
            upstream_block_uuids = payload.pop('upstream_blocks')

        return dict(
            name=payload.get('name'),
            repo_path=pipeline.repo_path,
            upstream_block_uuids=upstream_block_uuids,
            uuid=uuid,
            **extract(
                payload,
                [
                    'config',
                    'configuration',
                    'groups',
                    'type',
                ],
            ),
        )

    @classmethod
    async def create(cls, uuid: str, pipeline: Any, payload: Dict[str, Any]) -> Block:
        config = cls.preprocess_config(uuid, pipeline, payload)

        block_base = BlockBase.create(
            config.get('name') or config.get('uuid') or '',
            block_type=config['type'],
            repo_path=config['repo_path'],
            pipeline=pipeline,
            upstream_block_uuids=config['upstream_block_uuids'],
            **extract(
                config,
                [
                    'config',
                    'configuration',
                    'groups',
                ],
            ),
        )
        block = cls(block=block_base)
        if BlockType.PIPELINE == block.type:
            await block.create_pipeline_child()

        # Add the new block to an existing block’s downstream if the block is in the same group
        # and has no other downstream blocks.
        # if not upstream_block_uuids and block.groups:
        #     blocks_list = await asyncio.gather(*[
        #         pipeline.get_blocks_in_group(group_uuid) for group_uuid in block.groups
        #     ])
        #     blocks = flatten(blocks_list)

        #     if len(blocks) == 0:
        #         groups = await pipeline.get_framework_groups()
        #         groups_current = [g for g in groups if g.uuid in block.groups]

        #         groups_up = flatten([g.upstream_blocks for g in groups_current])
        #         group_blocks = await asyncio.gather(*[
        #             pipeline.get_blocks_in_group(guuid) for guuid in groups_up
        #         ])
        #         blocks += flatten(group_blocks)

        #     for blockup in blocks:
        #         if not blockup.downstream_blocks:
        #             upstream_block_uuids.append(blockup.uuid)

        await pipeline.add_block(block, upstream_block_uuids=config.get('upstream_block_uuids'))

        return block

    async def create_pipeline_child(self):
        self.pipeline_child = PipelineBase.create(self.name or self.uuid, self.repo_path)

    async def to_dict_async(
        self, *args, include_pipeline: Optional[bool] = None, **kwargs
    ) -> Dict:
        config = self.configuration or {}
        config['file'] = (
            Item.load(path=get_absolute_path(self.file.file_path)).to_dict() if self.file else None
        )

        data = dict(
            color=self.color,
            configuration=config,
            downstream_blocks=self.downstream_block_uuids or [],
            executor_config=self.executor_config,
            executor_type=self.executor_type,
            groups=self.groups,
            language=self.language,
            name=self.name,
            type=self.type,
            upstream_blocks=self.upstream_block_uuids or [],
            uuid=self.uuid,
        )

        if include_pipeline and self.pipeline:
            data['pipeline'] = await self.pipeline.to_dict_async()

        return data
