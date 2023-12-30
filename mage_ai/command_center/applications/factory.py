import os
from typing import Dict, List, Tuple

from mage_ai.command_center.applications.constants import ITEMS
from mage_ai.command_center.constants import ItemType, ObjectType
from mage_ai.command_center.factory import BaseFactory


class ApplicationFactory(BaseFactory):
    async def fetch_items(self, **kwargs) -> List[Tuple[int, Dict]]:
        items = []

        for item in ITEMS:
            item_dict = dict(
                item_type=ItemType.NAVIGATE,
                object_type=ObjectType.APPLICATION,
                title=item.get('title'),
                description=item.get('path').strip(os.path.sep),
                condition=item.get('condition'),
                actions=[
                    dict(
                        page=dict(
                            path=item.get('path'),
                        ),
                        uuid=item.get('title'),
                    ),
                ],
            )
            values = self.filter_score(item_dict)
            if values:
                items.append(values)

        return items
