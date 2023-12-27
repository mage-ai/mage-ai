from typing import List

from mage_ai.command_center.constants import CommandCenterItemType
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.files.constants import ITEMS
from mage_ai.command_center.models import Item


class Factory(BaseFactory):
    @classmethod
    def build_items(self, **kwargs) -> List[Item]:
        arr = []
        for item_dict in ITEMS:
            arr.append(Item.load(
                actions=item_dict.get('actions'),
                description=item_dict.get('description'),
                icon=item_dict.get('icon'),
                subtype=CommandCenterItemType.ACTION,
                title=item_dict.get('title'),
                type=CommandCenterItemType.FILE,
                uuid=item_dict.get('title'),
            ))

        return arr
