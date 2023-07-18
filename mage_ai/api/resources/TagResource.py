from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cache.tag import TagCache


class TagResource(GenericResource):
    @classmethod
    async def collection(self, query, meta, user, **kwargs):
        cache = await TagCache.initialize_cache()
        tag_uuids = cache.get_tags().keys()

        return self.build_result_set(
            [dict(uuid=uuid) for uuid in tag_uuids],
            user,
            **kwargs,
        )
