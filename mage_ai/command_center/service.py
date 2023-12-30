from typing import Dict, List

from mage_ai.command_center.applications.factory import ApplicationFactory
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.files.factory import FileFactory
from mage_ai.command_center.models import Item
from mage_ai.command_center.support.constants import ITEMS as ITEMS_SUPPORT
from mage_ai.orchestration.db.models.oauth import User

FACTORIES_OR_ITEMS = [
    FileFactory,
    ITEMS_SUPPORT,
    ApplicationFactory,
]


async def search_items(
    component: str = None,
    page: str = None,
    page_history: List[Dict] = None,
    search: str = None,
    search_history: List[Dict] = None,
    user: User = None,
) -> List[Item]:
    return await BaseFactory.create_items(
        FACTORIES_OR_ITEMS,
        component=component,
        page=page,
        page_history=page_history,
        search=search,
        search_history=search_history,
        user=user,
    )
