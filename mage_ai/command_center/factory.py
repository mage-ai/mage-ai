from abc import ABC
from typing import Dict, List

from mage_ai.command_center.models import Item
from mage_ai.data_preparation.models.project import Project
from mage_ai.shared.hash import ignore_keys, merge_dict


class BaseFactory(ABC):
    @classmethod
    def fetch_items(self, **kwargs) -> List[Dict]:
        return []

    @classmethod
    def process(self, items_dicts: List[Dict] = None, **kwargs) -> List[Item]:
        return self.__build_items(items_dicts or self.fetch_items(**kwargs), **kwargs)

    @classmethod
    def __build_items(self, items_dicts: List[Dict], **kwargs) -> List[Item]:
        project = Project(root_project=True)

        arr = []

        for item_dict in items_dicts:
            condition = item_dict.get('condition')

            if not condition or condition(merge_dict(dict(project=project), kwargs)):
                arr.append(Item.load(**merge_dict(ignore_keys(item_dict, [
                    'condition',
                ]), dict(
                    title=item_dict.get('title') or item_dict.get('uuid'),
                    uuid=item_dict.get('uuid') or item_dict.get('title'),
                ))))

        return arr
