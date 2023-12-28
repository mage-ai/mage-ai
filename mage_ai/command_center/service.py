from typing import Dict, List

from mage_ai.command_center.applications.factory import ApplicationFactory
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.files.factory import FileFactory
from mage_ai.command_center.models import Item
from mage_ai.command_center.support.constants import ITEMS as ITEMS_SUPPRT
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.shared.array import flatten


async def search_items(
    component: str = None,
    page: str = None,
    page_history: List[Dict] = None,
    search: str = None,
    search_history: List[Dict] = None,
    user: User = None,
) -> List[Item]:
    return flatten([
        FileFactory.process(user=user),
        BaseFactory.process(ITEMS_SUPPRT, user=user),
        ApplicationFactory.process(user=user),
    ])
