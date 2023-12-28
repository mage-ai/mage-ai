from typing import Dict, List

from mage_ai.command_center.applications.factory import ApplicationFactory
from mage_ai.command_center.files.factory import Factory as FileFactory
from mage_ai.command_center.models import Item
from mage_ai.command_center.support.factory import Factory as SupportFactory
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
        FileFactory.build_items(user=user),
        SupportFactory.build_items(user=user),
        ApplicationFactory.build_items(user=user),
    ])
