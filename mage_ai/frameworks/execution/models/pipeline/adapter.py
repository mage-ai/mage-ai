from __future__ import annotations

import asyncio
import os
from typing import Dict, List, Optional

import yaml

from mage_ai.data_preparation.models.constants import PIPELINES_FOLDER, BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline as PipelineBase
from mage_ai.frameworks.execution.models.block.adapter import Block
from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.files import find_files_with_criteria, remove_subpath


class Pipeline:
    def __init__(
        self,
        uuid: str,
        execution_framework: Optional[ExecutionFrameworkUUID] = None,
        pipeline: Optional[PipelineBase] = None,
    ):
        self.execution_framework = execution_framework
        self.uuid = uuid
        self._pipeline = pipeline

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
            execution_framework=pipeline.execution_framework,
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

    async def get_pipeline(self) -> PipelineBase:
        if self._pipeline:
            return self._pipeline
        self._pipeline = await PipelineBase.get_async(self.uuid, all_projects=True)
        return self._pipeline

    async def get_blocks(self) -> List[Block]:
        pipeline = await self.get_pipeline()
        return [Block(target=block) for block in pipeline.blocks_by_uuid.values()]

    async def get_pipelines(self) -> List[Pipeline]:
        blocks = await self.get_blocks()
        pipelines = await Pipeline.load_pipelines(
            uuids=[block.uuid for block in blocks if BlockType.PIPELINE == block.type],
        )

        arrs = await asyncio.gather(*[pipeline.get_pipelines() for pipeline in pipelines])
        for arr in arrs:
            pipelines.extend(arr)

        return pipelines

    async def to_dict_async(self, *args, **kwargs) -> Dict:
        pipeline = await self.get_pipeline()
        data = await pipeline.to_dict_async(*args, **kwargs) if pipeline else {}

        pipes = await self.get_pipelines()
        pdicts = await asyncio.gather(*[p.to_dict_async(*args, **kwargs) for p in pipes])
        data['pipelines'] = pdicts
        data['blocks'] = await self.get_blocks()

        return data
