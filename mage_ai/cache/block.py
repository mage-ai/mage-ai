import asyncio
import os
from datetime import datetime
from typing import Dict, List, Union

from mage_ai.cache.base import BaseCache
from mage_ai.cache.constants import CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING
from mage_ai.cache.utils import build_pipeline_dict
from mage_ai.settings.repo import get_repo_path


class BlockCache(BaseCache):
    cache_key = CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING

    @classmethod
    async def initialize_cache(
        self,
        caches: List[BaseCache] = None,
        file_path: str = None,
        replace: bool = False,
        repo_path: str = None,
        root_project: bool = True,
    ) -> 'BlockCache':
        repo_path = repo_path or get_repo_path(root_project=root_project)
        cache = self(repo_path=repo_path)
        if replace or not cache.exists():
            await cache.initialize_cache_for_all_pipelines(caches=caches, file_path=file_path)

        return cache

    def build_key(self, block: Union[Dict], repo_path: str = None) -> str:
        """Generate cache key for block.

        Args:
            block (Union[Dict]): The block dict or object.

        Returns:
            str: The cache key generated with block_type and block_uuid.
                 If block_type or block_uuid is None, return None.
        """
        block_type = ''
        block_uuid = ''
        configuration = None

        if isinstance(block, dict):
            block_type = block.get('type')
            block_uuid = block.get('uuid')
            configuration = block.get('configuration') or {}
        else:
            block_type = block.type
            block_uuid = block.uuid
            configuration = block.configuration or {}

        if not block_type or not block_uuid:
            return None

        if configuration:
            file_source = (configuration or {}).get('file_source') or {}
            if file_source and (file_source or {}).get('path'):
                return (file_source or {}).get('path')

        repo_path = repo_path or get_repo_path(root_project=False)

        return ':'.join([
            repo_path,
            os.path.join(block_type, block_uuid),
        ])

    def get_pipelines(self, block) -> Dict:
        pipelines_dict = {}

        mapping = self.get(self.cache_key)
        if mapping is not None:
            key = self.build_key(block)
            if key:
                pipelines_dict = mapping.get(key, {})

        return pipelines_dict

    def add_pipeline(self, block, pipeline) -> None:
        self.update_pipeline(block, pipeline, added_at=datetime.utcnow().timestamp())

    def move_pipelines(self, new_block, old_block) -> None:
        new_key = self.build_key(new_block)
        if not new_key:
            return

        old_key = self.build_key(old_block)
        if not old_key:
            return

        mapping = self.get(self.cache_key)
        if mapping is None:
            mapping = {}

        pipelines_dict = mapping.get(old_key, {})
        mapping[new_key] = pipelines_dict
        mapping.pop(old_key, None)

        self.set(self.cache_key, mapping)

    def update_pipeline(
        self,
        block,
        pipeline,
        added_at: str = None,
    ) -> None:
        self.update_pipelines(block, [pipeline], added_at)

    def update_pipelines(
        self,
        block,
        pipelines,
        added_at: str = None,
    ) -> None:
        key = self.build_key(block)
        if not key:
            return

        mapping = self.get(self.cache_key)
        if mapping is None:
            mapping = {}

        pipelines_dict = mapping.get(key, {})

        for pipeline in pipelines:
            pipeline_uuid = pipeline.get('uuid') if type(pipeline) is dict else pipeline.uuid
            pipelines_dict[pipeline_uuid] = build_pipeline_dict(
                pipeline,
                added_at=added_at,
            )

        mapping[key] = pipelines_dict

        self.set(self.cache_key, mapping)

    def remove_block(self, block) -> None:
        key = self.build_key(block)
        if not key:
            return

        mapping = self.get(self.cache_key)
        if mapping:
            mapping.pop(key, None)
        elif mapping is None:
            mapping = {}

        self.set(self.cache_key, mapping)

    def remove_pipeline(self, block, pipeline_uuid: str) -> None:
        key = self.build_key(block)
        if not key:
            return

        mapping = self.get(self.cache_key)
        if mapping is None:
            mapping = {}

        pipelines_dict = mapping.get(key, {})
        pipelines_dict.pop(pipeline_uuid, None)
        mapping[key] = pipelines_dict

        self.set(self.cache_key, mapping)

    async def initialize_cache_for_all_pipelines(
        self,
        caches: List[BaseCache] = None,
        file_path: str = None,
    ) -> None:
        from mage_ai.data_preparation.models.pipeline import Pipeline

        pipeline_uuids_and_repo_path = Pipeline.get_all_pipelines_all_projects(
            self.repo_path,
            include_repo_path=True,
        )

        pipeline_dicts = await asyncio.gather(
            *[Pipeline.load_metadata(
                uuid,
                raise_exception=False,
                repo_path=repo_path,
            ) for uuid, repo_path in pipeline_uuids_and_repo_path],
        )
        pipeline_dicts = [p for p in pipeline_dicts if p is not None]

        mapping = {}
        for pipeline_dict in pipeline_dicts:
            repo_path = pipeline_dict.get('repo_path')

            for block_dict in pipeline_dict.get('blocks', []):
                key = self.build_key(block_dict, repo_path=repo_path)
                if not key:
                    continue
                if key not in mapping:
                    mapping[key] = {}
                mapping[key][pipeline_dict['uuid']] = build_pipeline_dict(
                    pipeline_dict,
                    repo_path=repo_path,
                )

        if caches:
            for cache_class in caches:
                await cache_class.initialize_cache(
                    replace=True,
                    pipelines=pipeline_dicts,
                )

        self.set(self.cache_key, mapping)
