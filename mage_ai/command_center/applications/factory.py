from typing import List

from mage_ai.command_center.applications.constants import ITEMS
from mage_ai.command_center.constants import CommandCenterItemType
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.models import Item
from mage_ai.data_preparation.models.project import Project


class ApplicationFactory(BaseFactory):
    @classmethod
    def build_items(self, **kwargs) -> List[Item]:
        project = Project(root_project=True)

        arr = []
        for item_dict in ITEMS:
            condition = item_dict.get('condition')
            if not condition or condition(dict(project=project)):
                path = item_dict['path']

                arr.append(Item.load(
                    actions=[
                        dict(
                            page=dict(
                                path=path,
                            ),
                        ),
                    ],
                    description=path,
                    title=item_dict['uuid'],
                    type=CommandCenterItemType.APPLICATION,
                    uuid=item_dict['uuid'],
                ))

        return arr
