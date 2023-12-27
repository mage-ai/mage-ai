from typing import Dict, List

from mage_ai.command_center.applications.factory import ApplicationFactory
from mage_ai.command_center.models import Item
from mage_ai.command_center.support.factory import Factory as SupportFactory


async def search_items(
    component: str = None,
    page: str = None,
    page_history: List[Dict] = None,
    search: str = None,
    search_history: List[Dict] = None,
) -> List[Item]:
    return SupportFactory.build_items() + ApplicationFactory.build_items()
