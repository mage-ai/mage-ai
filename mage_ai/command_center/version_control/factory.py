from typing import Dict, List

from mage_ai.command_center.constants import (
    ApplicationType,
    ItemType,
    ModeType,
    ObjectType,
)
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.version_control.branches.factory import BranchFactory
from mage_ai.command_center.version_control.branches.utils import build as build_branch
from mage_ai.command_center.version_control.branches.utils import (
    build_and_score as build_and_score_branch,
)
from mage_ai.command_center.version_control.branches.utils import build_clone
from mage_ai.command_center.version_control.branches.utils import (
    build_create as build_create_branch,
)
from mage_ai.command_center.version_control.constants import (
    ACTIVATE_MODE,
    DEACTIVATE_MODE,
    build_authenticate_github,
)
from mage_ai.command_center.version_control.files.utils import build_generic_command
from mage_ai.command_center.version_control.projects.constants import (
    build_create_project,
)
from mage_ai.command_center.version_control.projects.utils import (
    build,
    build_and_score,
    build_delete_project,
)
from mage_ai.command_center.version_control.projects.utils import (
    build_update as build_update_project,
)
from mage_ai.command_center.version_control.remotes.utils import (
    build_and_score as build_and_score_remote,
)
from mage_ai.command_center.version_control.remotes.utils import (
    build_create as build_create_remote,
)
from mage_ai.command_center.version_control.remotes.utils import build_detail_list
from mage_ai.command_center.version_control.remotes.utils import (
    build_detail_list_items as build_detail_list_items_remote,
)
from mage_ai.command_center.version_control.remotes.utils import build_remote_list
from mage_ai.shared.hash import dig
from mage_ai.version_control.models import Branch, Project, Remote


class VersionControlFactory(BaseFactory):
    async def fetch_items(self, **kwargs) -> List[Dict]:
        self.branches = []
        self.remotes = []
        item_project = None

        items = []
        on_base_view = False

        # This has to come 1st because self.item is typically always in the API payload request.
        if self.results and self.results.get('project'):
            results = self.results.get('project') or []
            # Select the last result because the results from the front-end can contain multiple
            # results from previously executed actions since the results are stored in a ref.
            result = results[-1]
            if result and result.get('value'):
                item_project = Project.load(**result.get('value'))
                item_project.hydrate(user=self.user)
                item = await build(self, item_project)
                item['score'] = 999
                items.append(item)
        elif self.results and self.results.get('branch'):
            for result in (self.results.get('branch') or []):
                if result.get('value'):
                    value = result.get('value')

                    item_project = Project.load(uuid=value.get('project_uuid'))
                    item_project.hydrate(user=self.user)
                    model = Branch.load(
                        current=value.get('current'),
                        name=value.get('name'),
                    )
                    model.project = item_project
                    item = await build_branch(self, model)
                    item['score'] = 999
                    items.append(item)
        elif self.item and \
                self.application and \
                ApplicationType.DETAIL_LIST == self.application.application_type:
            """
            Project is selected, show:
                Create new branch
                1-way sync update
                2-way sync update
                Global configurations update
                All branches listed out
                Delete project
                Current remote
            """
            if ObjectType.PROJECT == self.item.object_type:
                # Project detail view with list of item rows for actions
                item_project = Project.load(**self.item.metadata.project.to_dict())
                item_project.hydrate(user=self.user)

                await build_update_project(self, item_project, items)
                await build_delete_project(self, item_project, items)

                self.remotes = Remote.load_all(project=item_project)
                await build_remote_list(self, item_project, items)
                await build_create_remote(self, item_project, items)

                await build_create_branch(self, item_project, items)

                self.branches = Branch.load_all(project=item_project)
                if self.branches:
                    for branch in self.branches:
                        await build_and_score_branch(self, branch, items)
                else:
                    await build_clone(self, items, project=item_project)

                # If there aren’t that many branches, maybe user is just getting started.
                if not self.branches or len(self.branches) <= 3:
                    for remote in (self.remotes or []):
                        for i in await build_detail_list(self, remote, include_fetch=True):
                            self.filter_score_mutate_accumulator(i, items)

            if self.item.object_type in [ObjectType.BRANCH, ObjectType.VERSION_CONTROL_FILE]:
                # Checkout
                # Clone
                # Delete

                initial_item = self.item
                branch_factory = self.build_another_factory(BranchFactory)
                items.extend(await branch_factory.fetch_items(item=initial_item))
                item_project = Project.load(**self.item.metadata.project.to_dict())
                item_project.hydrate(user=self.user)

            if ObjectType.REMOTE == self.item.object_type:
                # Detail view of remote with list of actions
                # Fetch
                # Update
                # Remote
                item_project = Project.load(**self.item.metadata.project.to_dict())
                item_project.hydrate(user=self.user)
                if self.item.metadata.remote:
                    remote = Remote.load(**self.item.metadata.remote.to_dict())
                    remote.project = item_project
                else:
                    remote = Remote(project=item_project)
                await build_detail_list_items_remote(self, remote, items)
        elif self.item and ItemType.LIST == self.item.item_type:
            if ObjectType.REMOTE == self.item.object_type:
                # Add remote
                # List of all remotes
                item_project = Project.load(**self.item.metadata.project.to_dict())
                item_project.hydrate(user=self.user)

                await build_create_remote(self, item_project, items)

                remotes = Remote.load_all(project=item_project)
                for remote in remotes:
                    await build_and_score_remote(self, remote, items)
        else:
            on_base_view = True
            create_project = build_create_project()

            if self.mode:
                if ModeType.VERSION_CONTROL == self.mode.type:
                    self.filter_score_mutate_accumulator(DEACTIVATE_MODE, items)
                    self.filter_score_mutate_accumulator(create_project | dict(score=100), items)
            else:
                self.filter_score_mutate_accumulator(ACTIVATE_MODE, items)

            for project in Project.load_all(user=self.user):
                await build_and_score(self, project, items)

        if not on_base_view and self.search and item_project:
            item = await build_generic_command(self, item_project)
            items.append(item)

        # Check for existing OAuth tokens. If exist, show action to reset them.
        if True:
            self.filter_score_mutate_accumulator(
                await build_authenticate_github(
                    page=self.page,
                    user=self.user,
                ),
                items,
            )

        return items

    def score_item(self, item_dict: Dict, score: int = None) -> int:
        item_type = item_dict.get('item_type')
        object_type = item_dict.get('object_type')

        if item_type in [
            ItemType.DELETE,
            ItemType.MODE_DEACTIVATION,
        ]:
            return 0

        if ObjectType.REMOTE == object_type:
            if ItemType.ACTION == item_type:
                return 5
            elif ItemType.LIST == item_type:
                return 4 if self.remotes else 1
            elif ItemType.UPDATE == item_type:
                return 3
            elif ItemType.DETAIL == item_type:
                return 2
            elif ItemType.CREATE == item_type:
                return 1 if self.remotes else 4

        if ObjectType.PROJECT == object_type:
            if ItemType.UPDATE == item_type:
                return 3

        if ObjectType.BRANCH == object_type:
            if dig(item_dict, ['metadata', 'branch', 'current']):
                return 5
            elif ItemType.CREATE == item_type:
                return 4
            elif ItemType.ACTION and not self.branches:
                return 5

        return score or 1
