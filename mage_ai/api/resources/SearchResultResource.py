from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.services.search.constants import SEARCH_TYPE_BLOCK_ACTION_OBJECTS
from typing import Dict


class SearchResultResource(GenericResource):
    @classmethod
    async def create(self, payload: Dict, user, **kwargs):
        query = payload.get('query', None)
        ratio = payload.get('ratio', None)
        search_type = payload.get('type', None)

        results = []

        if query:
            if SEARCH_TYPE_BLOCK_ACTION_OBJECTS == search_type:
                from mage_ai.services.search.block_action_objects import search

                results = await search(query, limit=40, ratio=ratio)

        return self(dict(
            results=results,
            type=search_type,
            uuid=query,
        ), user, **kwargs)
