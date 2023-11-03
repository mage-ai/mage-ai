import asyncio
import os
from datetime import datetime
from typing import Dict, List

from mage_ai.cache.base import BaseCache
from mage_ai.cache.constants import CACHE_KEY_TAGS_TO_OBJECT_MAPPING
from mage_ai.cache.utils import build_pipeline_dict

KEY_FOR_PIPELINES = 'Pipeline'
NO_TAGS_QUERY = 'no_tags'


class TagCache(BaseCache):
    cache_key = CACHE_KEY_TAGS_TO_OBJECT_MAPPING

    @classmethod
    async def initialize_cache(self, replace: bool = False) -> 'TagCache':
        cache = self()
        if replace or not cache.exists():
            await cache.initialize_cache_for_all_objects()

        return cache

    def get_tags(self) -> Dict:
        return self.get(self.cache_key) or {}

    def get_pipeline_uuids_with_tags(self, tags: List):
        tags_mapping = self.get_tags()
        pipeline_uuids = set()

        for tag_uuid in tags:
            pipelines_dict = tags_mapping.get(tag_uuid, {}).get(KEY_FOR_PIPELINES, {})
            if pipelines_dict:
                pipeline_uuids.update(pipelines_dict.keys())

        return list(pipeline_uuids)

    def get_all_pipeline_uuids_with_tags(self):
        tags_mapping = self.get_tags()
        pipeline_uuids = set()

        for tag in tags_mapping.values():
            pipelines_dict = tag.get(KEY_FOR_PIPELINES, {})
            if pipelines_dict:
                pipeline_uuids.update(pipelines_dict.keys())

        return list(pipeline_uuids)

    def build_key(self, tag_uuid: str) -> str:
        """Generate cache key for tag.

        Args:
            tag_uuid: str: The UUID of the tag.

        Returns:
            str: The cache key.
        """
        return os.path.join(tag_uuid)

    def add_pipeline(self, tag_uuid: str, pipeline) -> None:
        self.update_pipeline(tag_uuid, pipeline, added_at=datetime.utcnow().timestamp())

    def update_pipeline(
        self,
        tag_uuid: str,
        pipeline,
        added_at: str = None,
    ) -> None:
        self.update_pipelines(tag_uuid, [pipeline], added_at)

    def update_pipelines(
        self,
        tag_uuid: str,
        pipelines,
        added_at: str = None,
    ) -> None:
        key = self.build_key(tag_uuid)
        if not key:
            return

        mapping = self.get(self.cache_key)
        if mapping is None:
            mapping = {}

        if key not in mapping:
            mapping[key] = {}

        if KEY_FOR_PIPELINES not in mapping[key]:
            mapping[key][KEY_FOR_PIPELINES] = {}

        pipelines_dict = mapping[key].get(KEY_FOR_PIPELINES, {})

        for pipeline in pipelines:
            pipeline_uuid = pipeline.get('uuid') if type(pipeline) is dict else pipeline.uuid
            pipelines_dict[pipeline_uuid] = build_pipeline_dict(
                pipeline,
                added_at=added_at,
            )

        mapping[key][KEY_FOR_PIPELINES] = pipelines_dict

        self.set(self.cache_key, mapping)

    def remove_pipeline(self, tag_uuid: str, pipeline_uuid: str) -> None:
        key = self.build_key(tag_uuid)
        if not key:
            return

        mapping = self.get(self.cache_key)
        if mapping is None:
            mapping = {}

        if key not in mapping:
            mapping[key] = {}

        pipelines_dict = mapping[key].get(KEY_FOR_PIPELINES, {})
        pipelines_dict.pop(pipeline_uuid, None)
        mapping[key][KEY_FOR_PIPELINES] = pipelines_dict

        self.set(self.cache_key, mapping)

    async def initialize_cache_for_all_objects(self) -> None:
        from mage_ai.data_preparation.models.pipeline import Pipeline

        pipeline_uuids = Pipeline.get_all_pipelines(self.repo_path)

        pipeline_dicts = await asyncio.gather(
            *[Pipeline.load_metadata(uuid, raise_exception=False) for uuid in pipeline_uuids],
        )
        pipeline_dicts = [p for p in pipeline_dicts if p is not None]

        mapping = {}

        for pipeline_dict in pipeline_dicts:
            for tag_uuid in pipeline_dict.get('tags', []):
                key = self.build_key(tag_uuid)
                if not key:
                    continue

                if key not in mapping:
                    mapping[key] = {}

                if KEY_FOR_PIPELINES not in mapping[key]:
                    mapping[key][KEY_FOR_PIPELINES] = {}

                mapping[key][KEY_FOR_PIPELINES][pipeline_dict.get('uuid')] = build_pipeline_dict(
                    pipeline_dict,
                )

        self.set(self.cache_key, mapping)
