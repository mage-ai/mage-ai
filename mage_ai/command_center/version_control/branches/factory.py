from typing import Dict, List

from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.version_control.branches.utils import (
    build_and_score_detail,
    build_clone,
)
from mage_ai.command_center.version_control.files.utils import build_status
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

        # Status
        self.filter_score_mutate_accumulator(await build_status(self, model=branch), items)

        return items
