from typing import Dict, List

from mage_ai.command_center.models import Item


async def search_items(
    component: str = None,
    page: str = None,
    page_history: List[Dict] = None,
    search: str = None,
    search_history: List[Dict] = None,
) -> List[Item]:
    return []
