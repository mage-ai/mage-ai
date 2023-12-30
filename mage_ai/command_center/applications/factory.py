import os
from typing import Dict, List

from mage_ai.command_center.applications.constants import ITEMS
from mage_ai.command_center.constants import ItemType, ObjectType
from mage_ai.command_center.factory import BaseFactory


class ApplicationFactory(BaseFactory):
    async def fetch_items(self, **kwargs) -> List[Dict]:
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
            item_scored = self.filter_score(item_dict)
            if item_scored:
                items.append(item_scored)

        return items
