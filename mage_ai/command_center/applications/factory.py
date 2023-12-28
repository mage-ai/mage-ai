import os
from typing import Dict, List

from mage_ai.command_center.applications.constants import ITEMS
from mage_ai.command_center.constants import ItemType, ObjectType
from mage_ai.command_center.factory import BaseFactory


class ApplicationFactory(BaseFactory):
    @classmethod
    def fetch_items(self, **kwargs) -> List[Dict]:
        return [dict(
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
        ) for item in ITEMS]
