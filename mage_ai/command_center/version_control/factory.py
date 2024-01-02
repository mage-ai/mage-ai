from typing import Dict, List

from mage_ai.command_center.constants import (
    ApplicationType,
    ItemType,
    ModeType,
    ObjectType,
)
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.version_control.branches.utils import (
    build_and_score as build_and_score_branch,
)
from mage_ai.command_center.version_control.constants import (
    ACTIVATE_MODE,
    DEACTIVATE_MODE,
)
from mage_ai.command_center.version_control.projects.constants import ITEMS
from mage_ai.command_center.version_control.projects.utils import build, build_and_score
from mage_ai.version_control.models import Branch, Project, Remote


class VersionControlFactory(BaseFactory):
    async def fetch_items(self, **kwargs) -> List[Dict]:
        items = []

        if self.item and \
                ObjectType.PROJECT == self.item.object_type and \
                self.application and \
                ApplicationType.DETAIL_LIST == self.application.application_type:

            project = Project.load(**self.item.metadata.project.to_dict())
            Remote.load_all(project=project)

            branches = Branch.load_all(project=project)
            for branch in branches:
                await build_and_score_branch(self, branch, items)

        elif self.results and self.results.get('project'):
            for result in (self.results.get('project') or []):
                if result.get('value'):
                    project = Project.load(**result.get('value'))
                    item = await build(self, project)
                    item['score'] = 999
                    items.append(item)
        else:
            items.extend(ITEMS)

            if self.mode:
                if ModeType.VERSION_CONTROL == self.mode.type:
                    self.filter_score_mutate_accumulator(DEACTIVATE_MODE, items)
            else:
                self.filter_score_mutate_accumulator(ACTIVATE_MODE, items)

            for project in Project.load_all():
                await build_and_score(self, project, items)

        return items

    def score_item(self, item_dict: Dict, score: int = None) -> int:
        if ItemType.MODE_DEACTIVATION == item_dict.get('item_type'):
            return 0

        return 100 + item_dict.get('score', 0)
