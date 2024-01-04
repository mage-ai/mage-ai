from typing import Dict, List

from mage_ai.command_center.constants import ItemType, ObjectType
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.version_control.branches.utils import (
    build_and_score_detail,
    build_clone,
)
from mage_ai.command_center.version_control.files.utils import build_diff, build_status
from mage_ai.version_control.models import Branch, Project


class BranchFactory(BaseFactory):
    async def fetch_items(self, **kwargs) -> List[Dict]:
        items = []

        metadata = self.item.metadata
        project = Project.load(**metadata.project.to_dict())

        branch = Branch.load(**metadata.branch.to_dict())
        branch.project = project
        branch.update_attributes()

        # Clone
        if not branch.current:
            await build_clone(self, items, model=branch)

        # Checkout
        await build_and_score_detail(self, branch, items)

        # Diff
        self.filter_score_mutate_accumulator(await build_diff(self, model=branch), items)
        # Status
        self.filter_score_mutate_accumulator(await build_status(self, model=branch), items)

        return items

    def score_item(self, item_dict: Dict, score: int = None) -> int:
        item_type = item_dict.get('item_type')
        object_type = item_dict.get('object_type')

        if ObjectType.VERSION_CONTROL_FILE == object_type:
            if ItemType.ACTION == item_type:
                return 5
        elif ObjectType.BRANCH == object_type:
            if ItemType.DELETE == item_type:
                return 0
            return 3
