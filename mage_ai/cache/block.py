import asyncio
import os
from datetime import datetime
from typing import Dict, List, Union

import inflection

from mage_ai.cache.base import BaseCache
from mage_ai.cache.constants import CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING
from mage_ai.cache.utils import build_block_dict, build_pipeline_dict
from mage_ai.data_preparation.models.constants import (
    BLOCK_LANGUAGE_TO_FILE_EXTENSION,
    BlockType,
)
from mage_ai.data_preparation.models.utils import warn_for_repo_path
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.path_fixer import remove_base_repo_path_or_name


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
        block_language = ''
        configuration = None
        file_path = None

        warn_for_repo_path(repo_path)

        repo_path = repo_path or get_repo_path()

        if isinstance(block, dict):
            block_type = block.get('type')
            block_uuid = block.get('uuid')
            block_language = block.get('language')
            configuration = block.get('configuration') or {}
            block_type_plural = inflection.pluralize(block_type) \
                if block_type != BlockType.CUSTOM and block_type != BlockType.DBT \
                else block_type
            try:
                file_path = os.path.join(
                    repo_path,
                    block_type_plural,
                    block_uuid,
                )
            except Exception:
                return None
        else:
            block_type = block.type
            block_uuid = block.uuid
            configuration = block.configuration or {}
            file_path = block.file_path

        file_source = (configuration or {}).get('file_source') or {}
        if file_source.get('path'):
            return remove_base_repo_path_or_name(file_source.get('path'))
        elif block_language:
            block_file_extension = f'.{BLOCK_LANGUAGE_TO_FILE_EXTENSION[block_language]}'
            file_path = f'{file_path}{block_file_extension}'

        return remove_base_repo_path_or_name(file_path)

    def get_pipelines(self, block, repo_path: str) -> List[Dict]:
        pipelines = []

        mapping = self.get(self.cache_key)
        if mapping is not None:
            key = self.build_key(block, repo_path=repo_path)
            if key:
                return (mapping.get(key) or {}).get('pipelines', [])

        return pipelines

    def get_pipeline_count_mapping(self) -> Dict:
        pipeline_count_mapping = {}

        mapping = self.get(self.cache_key)
        for k, v in mapping.items():
            if not v:
                continue
            pipeline_count_mapping[k] = len(v.get('pipelines', []))

        return pipeline_count_mapping

    def add_pipeline(self, block, pipeline, repo_path: str) -> None:
        self.update_pipeline(block, pipeline, repo_path, added_at=datetime.utcnow().timestamp())

    def move_pipelines(self, new_block, old_block, repo_path: str) -> None:
        new_key = self.build_key(new_block, repo_path=repo_path)
        if not new_key:
            return

        old_key = self.build_key(old_block, repo_path=repo_path)
        if not old_key:
            return

        mapping = self.get(self.cache_key)
        if mapping is None:
            mapping = {}

        pipelines = mapping.get(old_key, [])
        mapping[new_key] = pipelines
        mapping.pop(old_key, None)

        self.set(self.cache_key, mapping)

    def update_pipeline(
        self,
        block,
        pipeline,
        repo_path: str,
        added_at: str = None,
    ) -> None:
        self.update_pipelines(block, [pipeline], repo_path, added_at)

    def update_pipelines(
        self,
        block,
        pipelines,
        repo_path: str,
        added_at: str = None,
    ) -> None:
        key = self.build_key(block, repo_path=repo_path)
        if not key:
            return

        mapping = self.get(self.cache_key)
        if mapping is None:
            mapping = {}

        pipelines_arr = (mapping.get(key) or {}).get('pipelines', [])

        for pipeline in pipelines:
            pipeline_uuid = None
            repo_path = None

            if isinstance(pipeline, dict):
                pipeline_uuid = pipeline.get('uuid')
                repo_path = pipeline.get('repo_path')
            else:
                pipeline_uuid = pipeline.uuid
                repo_path = pipeline.repo_path

            if not repo_path:
                repo_path = get_repo_path(root_project=False)

            repo_path = remove_base_repo_path_or_name(repo_path)

            def __filter(
                cache_dict: Dict,
                pipeline_uuid=pipeline_uuid,
                repo_path=repo_path,
            ) -> bool:
                pipeline_dict = cache_dict.get('pipeline') or {}

                return pipeline_dict.get('uuid') != pipeline_uuid \
                    or pipeline_dict.get('repo_path') != repo_path

            pipelines_arr = list(filter(__filter, pipelines_arr))
            pipelines_arr.append(build_pipeline_dict(
                pipeline,
                added_at=added_at,
                repo_path=repo_path,
            ))

        mapping[key] = dict(
            block=build_block_dict(block),
            pipelines=pipelines_arr,
        )

        self.set(self.cache_key, mapping)

    def remove_block(self, block, repo_path: str) -> None:
        key = self.build_key(block, repo_path=repo_path)
        if not key:
            return

        mapping = self.get(self.cache_key)
        if mapping:
            mapping.pop(key, None)
        elif mapping is None:
            mapping = {}

        self.set(self.cache_key, mapping)

    def remove_pipeline(self, block, pipeline_uuid: str, repo_path: str = None) -> None:
        repo_path = repo_path or get_repo_path(root_project=False)

        key = self.build_key(block, repo_path=repo_path)
        if not key:
            return

        mapping = self.get(self.cache_key)
        if mapping is None:
            mapping = []

        repo_path = remove_base_repo_path_or_name(repo_path)

        def __filter(cache_dict: Dict, pipeline_uuid=pipeline_uuid, repo_path=repo_path) -> bool:
            pipeline_dict = cache_dict.get('pipeline') or {}
            return pipeline_dict.get('uuid') != pipeline_uuid \
                or pipeline_dict.get('repo_path') != repo_path

        pipelines = (mapping.get(key) or {}).get('pipelines', [])

        mapping[key] = dict(
            block=build_block_dict(block),
            pipelines=list(filter(__filter, pipelines)),
        )

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
                    mapping[key] = dict(
                        block=build_block_dict(block_dict),
                        pipelines=[],
                    )

                mapping[key]['pipelines'].append(build_pipeline_dict(
                    pipeline_dict,
                    repo_path=remove_base_repo_path_or_name(repo_path) if repo_path else repo_path,
                ))

        if caches:
            for cache_class in caches:
                await cache_class.initialize_cache(
                    replace=True,
                    pipelines=pipeline_dicts,
                )

        self.set(self.cache_key, mapping)
