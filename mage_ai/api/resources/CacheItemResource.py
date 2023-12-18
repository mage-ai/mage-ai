from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.cache.constants import CacheItemType
from mage_ai.cache.dbt.cache import DBTCache


class CacheItemResource(AsyncBaseResource):
    @classmethod
    async def collection(self, query, _meta, user, **kwargs):
        item_type = query.get('item_type', [None])
        if item_type:
            item_type = item_type[0]

        results = []

        if CacheItemType.DBT == item_type:
            cache = await DBTCache.initialize_cache_async(replace=False, root_project=True)
            results.extend(cache.get_cache_items())

        return self.build_result_set(
            sorted(results, key=lambda x: x.uuid),
            user,
            **kwargs,
        )
