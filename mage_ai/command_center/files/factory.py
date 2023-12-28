from typing import List

from mage_ai.command_center.constants import CommandCenterItemType
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.files.constants import ITEMS
from mage_ai.command_center.models import Item
from mage_ai.shared.hash import ignore_keys, merge_dict


class Factory(BaseFactory):
    @classmethod
    def build_items(self, **kwargs) -> List[Item]:
        arr = []
        for item_dict in ITEMS:
            condition = item_dict.get('condition')
            if not condition or condition(kwargs):
                arr.append(Item.load(**merge_dict(ignore_keys(item_dict, [
                    'condition',
                ]), dict(
                    title=item_dict.get('title') or item_dict.get('uuid'),
                    type=CommandCenterItemType.FILE,
                    uuid=item_dict.get('uuid') or item_dict.get('title'),
                ))))

        return arr
