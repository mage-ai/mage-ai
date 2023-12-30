from typing import Dict, List, Tuple

from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.files.constants import ITEMS


class FileFactory(BaseFactory):
    async def fetch_items(self, **kwargs) -> List[Tuple[int, Dict]]:
        items = []

        for item_dict in ITEMS:
            values = self.filter_score(item_dict)
            if values:
                items.append(values)

        return items
