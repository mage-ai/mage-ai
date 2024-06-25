from __future__ import annotations

import asyncio
import os
from typing import Any, Dict, List, Optional

import yaml

from mage_ai.data_preparation.models.constants import (
    PIPELINES_FOLDER,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline as PipelineBase
from mage_ai.frameworks.execution.models.block.adapter import Block
from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.files import find_files_with_criteria, remove_subpath
from mage_ai.shared.hash import ignore_keys_with_blank_values, index_by
from mage_ai.shared.models import DelegatorTarget


class Pipeline(DelegatorTarget):
    def __init__(
        self,
        uuid: str,
        execution_framework: Optional[ExecutionFrameworkUUID] = None,
        pipeline: Optional[PipelineBase] = None,
    ):
        super().__init__(pipeline)

        self.execution_framework = execution_framework
        self.pipeline = pipeline
        self.uuid = uuid

        self.blocks = None
        self.pipelines = None

    @classmethod
    async def load_config_from_content(cls, content: str, dir_name: str) -> Optional[Pipeline]:
        if not content or not dir_name:
            return

        config = await asyncio.to_thread(yaml.safe_load, content)

        uuid = os.path.basename(dir_name)
        repo_path = remove_subpath(dir_name, os.path.join(PIPELINES_FOLDER, uuid))
        pipeline = PipelineBase(repo_path=repo_path, uuid=uuid)
        pipeline.load_config(config)

        return cls(
            uuid=uuid,
            execution_framework=(
                ExecutionFrameworkUUID.from_value(pipeline.execution_framework)
                if isinstance(pipeline.execution_framework, str)
                else pipeline.execution_framework
            )
            if pipeline is not None
            else None,
            pipeline=pipeline,
        )

    @classmethod
    async def load_pipelines(
        cls,
        execution_framework_uuids: Optional[List[ExecutionFrameworkUUID]] = None,
        repo_paths: Optional[List[str]] = None,
        uuids: Optional[List[str]] = None,
    ) -> List[Pipeline]:
        directories = [
            os.path.join(repo_path, PIPELINES_FOLDER)
            for repo_path in (repo_paths or [get_repo_path(root_project=False)])
        ]

        criteria = {}

        if uuids is not None:
            criteria['uuid'] = uuids

        if execution_framework_uuids is not None:
            fuuids: List[str] = [str(e.value) for e in execution_framework_uuids]
            criteria['execution_framework'] = fuuids

        result = await find_files_with_criteria(directories, criteria)

        pipelines = await asyncio.gather(*[
            cls.load_config_from_content(
                content=info.get('content') or '',
                dir_name=info.get('dir_name') or '',
            )
            for info in result
            if info
            and isinstance(info, dict)
            and info.get('content') is not None
            and info.get('dir_name') is not None
        ])
        return [pipeline for pipeline in pipelines if pipeline is not None]

    async def get_pipeline(self, refresh: Optional[bool] = None) -> PipelineBase:
        if self.pipeline and not refresh:
            return self.pipeline
        self.pipeline = await PipelineBase.get_async(self.uuid, all_projects=True)
        return self.pipeline

    async def get_blocks(self, refresh: Optional[bool] = None) -> List[Block]:
        if self.blocks and not refresh:
            return self.blocks
        pipeline = await self.get_pipeline()
        self.blocks = [Block(block=block) for block in pipeline.blocks_by_uuid.values()]

        return self.blocks

    async def get_pipelines(self, refresh: Optional[bool] = None) -> List[Pipeline]:
        if self.pipelines and not refresh:
            return self.pipelines

        await self.get_blocks(refresh=refresh)
        self.pipelines = await Pipeline.load_pipelines(
            uuids=[
                block.uuid for block in (self.blocks or []) if BlockType.PIPELINE == block.type
            ],
        )

        await asyncio.gather(*[
            pipeline.get_pipelines(refresh=refresh) for pipeline in self.pipelines
        ])

        return self.pipelines

    async def to_dict_async(self, *args, **kwargs) -> Dict:
        pipeline = await self.get_pipeline()
        data = await pipeline.to_dict_async(*args, **kwargs) if pipeline else {}

        pipes = await self.get_pipelines()
        pdicts = await asyncio.gather(*[p.to_dict_async(*args, **kwargs) for p in pipes])
        data['pipelines'] = pdicts
        data['blocks'] = await self.get_blocks()

        return data

    async def add_block(self, block: Block, *args, **kwargs):
        pipeline = await self.get_pipeline()
        pipeline.add_block(block.block, *args, **kwargs)

    async def update(
        self,
        blocks: Optional[List[Dict[str, Any]]] = None,
        description: Optional[str] = None,
        name: Optional[str] = None,
        pipelines: Optional[List[Dict[str, Any]]] = None,
        settings: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        type: Optional[PipelineType] = None,
        **kwargs,
    ):
        block_payloads = index_by(lambda x: x['uuid'], blocks or [])
        await self.get_blocks(refresh=True)
        for block in self.blocks or []:
            if block.uuid not in block_payloads:
                self.delete_block(block.block)
            else:
                block.update(ignore_keys_with_blank_values(block_payloads.pop(block.uuid)))

        for uuid, payload in block_payloads.items():
            await Block.create(uuid, self, payload)

        await self.get_pipeline(refresh=True)
        if self.pipeline is not None:
            await self.pipeline.update(
                ignore_keys_with_blank_values(
                    dict(
                        description=description,
                        name=name,
                        settings=settings,
                        tags=tags,
                        type=type,
                    )
                ),
            )

        pipeline_payloads = index_by(lambda x: x['uuid'], pipelines or [])
        await self.get_pipelines(refresh=True)
        await asyncio.gather(*[
            adapter.update(
                **ignore_keys_with_blank_values(pipeline_payloads.get(adapter.uuid) or {})
            )
            for adapter in (self.pipelines or [])
            if pipeline_payloads.get(adapter.uuid)
        ])
