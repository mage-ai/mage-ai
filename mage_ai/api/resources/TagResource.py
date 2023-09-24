from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.cache.tag import TagCache
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.tags import Tag
from mage_ai.shared.array import unique_by


class TagResource(DatabaseResource):
    model_class = Tag

    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        cache = await TagCache.initialize_cache()
        tag_uuids = cache.get_tags().keys()
        tags = sorted(
            unique_by(
                list(Tag.query.all()) + [Tag(name=uuid) for uuid in tag_uuids],
                lambda x: x.name,
            ),
            key=lambda x: x.name,
        )

        return self.build_result_set(
            tags,
            user,
            **kwargs,
        )
