from typing import Dict

from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.command_center.utils import search_items
from mage_ai.orchestration.db.models.oauth import User


class CommandCenterItemResource(AsyncBaseResource):
    @classmethod
    async def collection(self, query: Dict, _meta: Dict, user: User, **kwargs):
        search = query.get('search', [None])
        if search:
            search = search[0]

        page = query.get('page', [None])
        if page:
            page = page[0]

        component = query.get('component', [None])
        if component:
            component = component[0]

        results = await search_items(
            component=component,
            page=page,
            search=search,
        )

        return self.build_result_set(results, user, **kwargs)
