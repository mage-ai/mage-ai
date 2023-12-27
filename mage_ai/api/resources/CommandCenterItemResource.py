from typing import Dict

from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.command_center.utils import search_items
from mage_ai.orchestration.db.models.oauth import User


class CommandCenterItemResource(AsyncBaseResource):
    @classmethod
    async def create(self, payload: Dict, user: User, **kwargs) -> 'CommandCenterItemResource':
        items = await search_items(**payload)

        return self(dict(items=items), user, **kwargs)
