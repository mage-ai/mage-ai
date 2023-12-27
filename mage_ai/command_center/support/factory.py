from typing import List

from mage_ai.command_center.constants import CommandCenterItemType
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.models import Item
from mage_ai.command_center.support.constants import ITEMS


class Factory(BaseFactory):
    @classmethod
    def build_items(self, **kwargs) -> List[Item]:
        arr = []
        for item_dict in ITEMS:
            arr.append(Item.load(
                actions=[
                    dict(
                        page=dict(
                            path=item_dict['path'],
                        ),
                    ),
                ],
                color_uuid=item_dict['color_uuid'],
                description=item_dict['description'],
                icon=item_dict['icon'],
                subtype=CommandCenterItemType.SUPPORT,
                title=item_dict['title'],
                type=CommandCenterItemType.APPLICATION,
                uuid=item_dict['title'],
            ))

        return arr
