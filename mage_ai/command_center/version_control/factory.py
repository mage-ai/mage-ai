from typing import Dict, List

from mage_ai.command_center.constants import ItemType, ModeType
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.version_control.constants import (
    ACTIVATE_MODE,
    DEACTIVATE_MODE,
)
from mage_ai.command_center.version_control.projects.constants import ITEMS
from mage_ai.command_center.version_control.projects.utils import build_and_score
from mage_ai.version_control.models import Project


class VersionControlFactory(BaseFactory):
    async def fetch_items(self, **kwargs) -> List[Dict]:
        items = [] + ITEMS

        if ModeType.VERSION_CONTROL == self.mode:
            self.filter_score_mutate_accumulator(DEACTIVATE_MODE, items)
        elif not self.mode:
            self.filter_score_mutate_accumulator(ACTIVATE_MODE, items)

        for project in Project.load_all():
            await build_and_score(self, project, items)

        return items

    def score_item(self, item_dict: Dict, score: int = None) -> int:
        if ItemType.MODE_DEACTIVATION == item_dict.get('item_type'):
            return 0

        return 100 + item_dict.get('score', 0)
