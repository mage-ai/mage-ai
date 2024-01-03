from typing import Dict, List

from mage_ai.command_center.constants import (
    ApplicationType,
    ItemType,
    ModeType,
    ObjectType,
)
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.version_control.branches.utils import build as build_branch
from mage_ai.command_center.version_control.branches.utils import (
    build_and_score as build_and_score_branch,
)
from mage_ai.command_center.version_control.branches.utils import (
    build_and_score_detail as build_and_score_detail_branch,
)
from mage_ai.command_center.version_control.branches.utils import (
    build_create as build_create_branch,
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

        # This has to come 1st because self.item is typically always in the API payload request.
        if self.results and self.results.get('project'):
            for result in (self.results.get('project') or []):
                if result.get('value'):
                    project = Project.load(**result.get('value'))
                    item = await build(self, project)
                    item['score'] = 999
                    items.append(item)
        elif self.results and self.results.get('branch'):
            for result in (self.results.get('branch') or []):
                if result.get('value'):
                    value = result.get('value')

                    project = Project.load(uuid=value.get('project_uuid'))
                    model = Branch.load(
                        current=value.get('current'),
                        name=value.get('name'),
                    )
                    model.project = project
                    item = await build_branch(self, model)
                    item['score'] = 999
                    items.append(item)
        elif self.item and \
                self.application and \
                ApplicationType.DETAIL_LIST == self.application.application_type:

            if ObjectType.PROJECT == self.item.object_type:
                project = Project.load(**self.item.metadata.project.to_dict())
                Remote.load_all(project=project)

                await build_create_branch(self, project, items)
                await build_and_score(self, project, items)

                branches = Branch.load_all(project=project)
                for branch in branches:
                    await build_and_score_branch(self, branch, items)

            if ObjectType.BRANCH == self.item.object_type:
                metadata = self.item.metadata

                project = Project.load(**metadata.project.to_dict())

                branch = Branch.load(**metadata.branch.to_dict())
                branch.project = project
                branch.update_attributes()

                await build_and_score_detail_branch(self, branch, items)
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
