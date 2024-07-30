from __future__ import annotations

import asyncio
import os
from typing import Any, Dict, List, Optional

import yaml
from typing_extensions import Union

from mage_ai.data_preparation.models.constants import (
    PIPELINES_FOLDER,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline as PipelineBase
from mage_ai.frameworks.execution.models.block.adapter import Block
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID, GroupUUID
from mage_ai.frameworks.execution.models.pipeline.base import PipelineExecutionFramework
from mage_ai.frameworks.execution.models.pipeline.utils import get_framework
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.files import find_files_with_criteria
from mage_ai.shared.models import DelegatorTarget


class Pipeline(DelegatorTarget):
    def __init__(
        self,
        uuid: str,
        execution_framework: Optional[ExecutionFrameworkUUID] = None,
        framework: Optional[PipelineExecutionFramework] = None,
        pipeline: Optional[PipelineBase] = None,
    ):
        super().__init__(pipeline)

        self.execution_framework = execution_framework
        self.framework = framework
        self.pipeline = pipeline
        self.uuid = uuid

        self.blocks = None
        self.pipelines = None

    @classmethod
    async def load_config_from_content(
        cls, content: str, dir_name: str, framework: Optional[PipelineExecutionFramework] = None
    ) -> Optional[Pipeline]:
        if not content or not dir_name:
            return

        config = await asyncio.to_thread(yaml.safe_load, content)

        uuid = os.path.basename(dir_name)
        repo_path = dir_name.split(os.path.join(PIPELINES_FOLDER, uuid))[0]
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
            framework=framework,
            pipeline=pipeline,
        )

    @classmethod
    async def load_pipelines(
        cls,
        execution_framework_uuids: Optional[List[ExecutionFrameworkUUID]] = None,
        framework: Optional[PipelineExecutionFramework] = None,
        repo_paths: Optional[List[str]] = None,
        uuids: Optional[List[str]] = None,
    ) -> List[Pipeline]:
        pipelines = []

        if (framework and framework.uuid == ExecutionFrameworkUUID.STANDARD) or (
            execution_framework_uuids
            and ExecutionFrameworkUUID.STANDARD in execution_framework_uuids
        ):
            base_pipelines = await asyncio.gather(*[
                PipelineBase.get_async(uuid, all_projects=True) for uuid in uuids or []
            ])
            for base_pipeline in base_pipelines:
                pipelines.append(
                    cls(
                        uuid=base_pipeline.uuid,
                        execution_framework=ExecutionFrameworkUUID.STANDARD,
                        framework=framework,
                        pipeline=base_pipeline,
                    )
                )
        else:
            directories = [
                os.path.join(repo_path, PIPELINES_FOLDER)
                for repo_path in (repo_paths or [get_repo_path(root_project=False)])
            ]

            criteria = {}

            if uuids is not None:
                criteria['uuid'] = uuids

            if execution_framework_uuids is None:
                execution_framework_uuids = []

            if framework is not None:
                execution_framework_uuids.append(ExecutionFrameworkUUID.from_value(framework.uuid))

            if execution_framework_uuids is not None:
                fuuids: List[str] = [value for value in execution_framework_uuids]
                criteria['execution_framework'] = fuuids

            result = await find_files_with_criteria(directories, criteria)

            pipelines = await asyncio.gather(*[
                cls.load_config_from_content(
                    content=info.get('content') or '',
                    dir_name=info.get('dir_name') or '',
                    framework=framework,
                )
                for info in result
                if info
                and isinstance(info, dict)
                and info.get('content') is not None
                and info.get('dir_name') is not None
            ])

        return [pipeline for pipeline in pipelines if pipeline is not None]

    async def get_framework(self) -> Union[PipelineExecutionFramework, None]:
        if self.framework:
            return self.framework

        if not self.execution_framework:
            return None
        return await get_framework(self.execution_framework)

    async def get_framework_groups(self) -> List[BlockExecutionFramework]:
        framework = await self.get_framework()
        if not framework:
            return []
        return framework.get_blocks()

    async def get_blocks_in_group(self, uuid: GroupUUID) -> List[Block]:
        blocks = await self.get_blocks(refresh=True)
        return [block for block in blocks if block.groups and uuid in block.groups]

    async def get_pipeline(self, refresh: Optional[bool] = None) -> PipelineBase:
        if self.pipeline and not refresh:
            return self.pipeline
        self.pipeline = await PipelineBase.get_async(self.uuid, all_projects=True)
        return self.pipeline

    async def get_blocks(self, refresh: Optional[bool] = None) -> List[Block]:
        if self.blocks and not refresh:
            return self.blocks
        await self.get_pipeline(refresh=refresh)
        self.blocks = [
            Block(block=block, pipeline=self.pipeline)
            for block in (self.pipeline.blocks_by_uuid.values() if self.pipeline else [])
        ]

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

    async def create_block(self, payload: Dict) -> Block:
        return await Block.create(payload.get('uuid', payload.get('name')), self, payload)

    async def to_dict_async(
        self,
        *args,
        include_framework: Optional[bool] = None,
        include_pipelines: Optional[bool] = None,
        **kwargs,
    ) -> Dict:
        await self.get_blocks(refresh=True)

        data = dict(
            description=self.description,
            execution_framework=self.execution_framework,
            name=self.name,
            tags=self.tags,
            type=self.type,
            uuid=self.uuid,
            variables=self.variables,
        )

        if self.blocks:
            data['blocks'] = await asyncio.gather(*[
                block.to_dict_async(*args, **kwargs) for block in self.blocks
            ])

        if include_pipelines:
            await self.get_pipelines()
            data['pipelines'] = await asyncio.gather(*[
                pipeline.to_dict_async(
                    *args,
                    **kwargs,
                    include_pipelines=include_pipelines,
                )
                for pipeline in self.pipelines
            ])

        if include_framework:
            framework = await self.get_framework()
            if framework:
                data['framework'] = await framework.to_dict_async(
                    ignore_empty=True,
                    include_templates=True,
                )

        return data

    async def add_block(self, block: Block, *args, **kwargs):
        pipeline = await self.get_pipeline()
        pipeline.add_block(block.block, *args, **kwargs)

    async def remove_block(self, block: Block, *args, **kwargs):
        self.delete_block(block.block, commit=True, force=True)

    async def update_downstream_blocks(self, block: Block, downstream_block_uuids: List[str]):
        if not self.pipeline:
            return
        self.pipeline.update_block(block.block, downstream_block_uuids=downstream_block_uuids)
        await self.pipeline.save_async(include_execution_framework=True)

    async def update_block_configuration(self, block: Block, configuration: Dict):
        if not self.pipeline:
            return

        block_dict = self.pipeline.blocks_by_uuid.get(block.uuid)
        if not block_dict:
            return

        block_dict.update(dict(configuration=configuration))
        self.pipeline.blocks_by_uuid[block.uuid] = block_dict
        await self.pipeline.save_async(include_execution_framework=True)

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
        pass
        # block_payloads = index_by(lambda x: x['uuid'], blocks or [])
        # await self.get_blocks(refresh=True)
        # for block in self.blocks or []:
        #     if block.uuid not in block_payloads:
        #         self.delete_block(block.block, force=True)
        #     else:
        #         pay = block_payloads.pop(block.uuid)
        #         block.update(ignore_keys_with_blank_values(pay))

        # for uuid, payload in block_payloads.items():
        #     await Block.create(uuid, self, payload)

        # await self.get_pipeline(refresh=True)
        # if self.pipeline is not None:
        #     await self.pipeline.update(
        #         ignore_keys_with_blank_values(
        #             dict(
        #                 description=description,
        #                 name=name,
        #                 settings=settings,
        #                 tags=tags,
        #                 type=type,
        #             )
        #         ),
        #     )

        # pipeline_payloads = index_by(lambda x: x['uuid'], pipelines or [])
        # await self.get_pipelines(refresh=True)
        # await asyncio.gather(*[
        #     adapter.update(
        #         **ignore_keys_with_blank_values(pipeline_payloads.get(adapter.uuid) or {})
        #     )
        #     for adapter in (self.pipelines or [])
        #     if pipeline_payloads.get(adapter.uuid)
        # ])
