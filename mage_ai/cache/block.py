import asyncio
import os
from datetime import datetime
from typing import Dict, Union

from mage_ai.cache.base import BaseCache
from mage_ai.cache.constants import CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING


class BlockCache(BaseCache):
    @classmethod
    async def initialize_cache(self, replace: bool = False) -> 'BlockCache':
        cache = self()
        if replace or not cache.exists():
            await cache.initialize_cache_for_all_pipelines()

        return cache

    def build_key(self, block: Union[Dict]) -> str:
        """Generate cache key for block.

        Args:
            block (Union[Dict]): The block dict or object.

        Returns:
            str: The cache key generated with block_type and block_uuid.
                 If block_type or block_uuid is None, return None.
        """
        block_type = ''
        block_uuid = ''

        if type(block) is dict:
            block_type = block.get('type')
            block_uuid = block.get('uuid')
        else:
            block_type = block.type
            block_uuid = block.uuid
        if not block_type or not block_uuid:
            return None
        return os.path.join(block_type, block_uuid)

    def exists(self) -> bool:
        return self.get(CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING) is not None

    def get_pipelines(self, block) -> Dict:
        pipelines_dict = {}

        mapping = self.get(CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING)
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

        mapping = self.get(CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING)
        if mapping is None:
            mapping = {}

        pipelines_dict = mapping.get(old_key, {})
        mapping[new_key] = pipelines_dict
        mapping.pop(old_key, None)

        self.set(CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING, mapping)

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

        mapping = self.get(CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING)
        if mapping is None:
            mapping = {}

        pipelines_dict = mapping.get(key, {})

        for pipeline in pipelines:
            pipeline_uuid = pipeline.get('uuid') if type(pipeline) is dict else pipeline.uuid
            pipelines_dict[pipeline_uuid] = self.__build_pipeline_dict(
                pipeline,
                added_at=added_at,
            )

        mapping[key] = pipelines_dict

        self.set(CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING, mapping)

    def remove_block(self, block) -> None:
        key = self.build_key(block)
        if not key:
            return

        mapping = self.get(CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING)
        if mapping:
            mapping.pop(key, None)
        elif mapping is None:
            mapping = {}

        self.set(CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING, mapping)

    def remove_pipeline(self, block, pipeline_uuid: str) -> None:
        key = self.build_key(block)
        if not key:
            return

        mapping = self.get(CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING)
        if mapping is None:
            mapping = {}

        pipelines_dict = mapping.get(key, {})
        pipelines_dict.pop(pipeline_uuid, None)
        mapping[key] = pipelines_dict

        self.set(CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING, mapping)

    async def initialize_cache_for_all_pipelines(self) -> None:
        from mage_ai.data_preparation.models.pipeline import Pipeline

        pipeline_uuids = Pipeline.get_all_pipelines(self.repo_path)

        pipeline_dicts = await asyncio.gather(
            *[Pipeline.load_metadata(uuid, raise_exception=False) for uuid in pipeline_uuids],
        )
        pipeline_dicts = [p for p in pipeline_dicts if p is not None]

        mapping = {}
        for pipeline_dict in pipeline_dicts:
            for block_dict in pipeline_dict.get('blocks', []):
                key = self.build_key(block_dict)
                if not key:
                    continue
                if key not in mapping:
                    mapping[key] = {}
                mapping[key][pipeline_dict['uuid']] = self.__build_pipeline_dict(pipeline_dict)

        self.set(CACHE_KEY_BLOCKS_TO_PIPELINE_MAPPING, mapping)

    def __build_pipeline_dict(
        self,
        pipeline: Union[Dict],
        added_at: str = None
    ) -> None:
        pipeline_description = None
        pipeline_name = None
        pipeline_type = None
        pipeline_updated_at = None
        pipeline_uuid = None

        if type(pipeline) is dict:
            pipeline_description = pipeline.get('description')
            pipeline_name = pipeline.get('name')
            pipeline_type = pipeline.get('type')
            pipeline_updated_at = pipeline.get('updated_at')
            pipeline_uuid = pipeline.get('uuid')
        else:
            pipeline_description = pipeline.description
            pipeline_name = pipeline.name
            pipeline_type = pipeline.type
            pipeline_updated_at = pipeline.updated_at
            pipeline_uuid = pipeline.uuid

        return dict(
            added_at=added_at,
            pipeline=dict(
                description=pipeline_description,
                name=pipeline_name,
                type=pipeline_type,
                updated_at=pipeline_updated_at,
                uuid=pipeline_uuid,
            ),
            updated_at=datetime.utcnow().timestamp(),
        )
