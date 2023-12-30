from typing import Dict, List

from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.files.constants import ITEMS


class FileFactory(BaseFactory):
    async def fetch_items(self, **kwargs) -> List[Dict]:
        items = []

        for item_dict in ITEMS:
            item_scored = self.filter_score(item_dict)
            if item_scored:
                items.append(item_scored)

        return items
