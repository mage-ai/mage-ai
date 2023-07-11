import asyncio

from mage_ai.cache.base import BaseCache
from mage_ai.cache.constants import CACHE_KEY_TAGS_TO_OBJECT_MAPPING


class TagCache(BaseCache):
    @classmethod
    async def initialize_cache(self, replace: bool = False) -> 'TagCache':
        cache = self()
        if replace or not cache.exists():
            await cache.initialize_cache_for_all_objects()

        return cache

    async def initialize_cache_for_all_objects(self) -> None:
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

        self.set(CACHE_KEY_TAGS_TO_OBJECT_MAPPING, mapping)
