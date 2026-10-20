from typing import Dict, List

from mage_ai.command_center.applications.utils import build_close_application
from mage_ai.command_center.constants import (
    ApplicationExpansionStatus,
    ApplicationExpansionUUID,
    ApplicationType,
    ItemType,
    ObjectType,
)
from mage_ai.command_center.factory import BaseFactory
from mage_ai.command_center.models import Item
from mage_ai.command_center.version_control.branches.utils import (
    branch_metadata,
    build_and_score_detail,
    build_clone,
    build_delete_branch,
    build_merge,
    build_pull,
    build_push,
    build_rebase,
)
from mage_ai.command_center.version_control.files.utils import (
    build_add_staging,
    build_add_staging_selected,
    build_checkout_files_application,
    build_checkout_single_files,
    build_commit_files,
    build_diff,
    build_log,
    build_reset_all,
    build_reset_selected,
    build_status,
)
from mage_ai.shared.array import find
from mage_ai.version_control.models import Branch, File, Project


class BranchFactory(BaseFactory):
    async def fetch_items(self, item: Item = None, **kwargs) -> List[Dict]:
        items = []

        metadata = self.item.metadata
        project = Project.load(**metadata.project.to_dict())

        branch = Branch.load(**metadata.branch.to_dict())
        branch.project = project
        branch.update_attributes()

        # Diff
        app = None
        if self.applications:
            app = find(
                lambda x: x.get('uuid') == ApplicationExpansionUUID.VersionControlFileDiffs,
                self.applications,
            )
            if app:
                if ApplicationExpansionStatus.MINIMIZED == (app.get('state') or {}).get('status'):
                    pass

                self.filter_score_mutate_accumulator(
                    await build_close_application(ApplicationExpansionUUID.VersionControlFileDiffs),
                    items,
                )

        if not app:
            self.filter_score_mutate_accumulator(await build_diff(self, model=branch), items)

        if item and \
                ObjectType.VERSION_CONTROL_FILE == item.object_type and \
                self.application and \
                ApplicationType.DETAIL_LIST == self.application.application_type:

            for file in File.load_all(project=project):
                if file.unstaged:
                    self.filter_score_mutate_accumulator(
                        await build_checkout_single_files(self, model=file, branch=branch),
                        items,
                    )
        else:
            # Log
            self.filter_score_mutate_accumulator(await build_log(self, model=branch), items)

            # Clone
            if not branch.current:
                await build_clone(self, items, model=branch)

            # Checkout
            await build_and_score_detail(self, branch, items)

            # Status
            self.filter_score_mutate_accumulator(await build_status(self, model=branch), items)

            # git add .
            self.filter_score_mutate_accumulator(await build_add_staging(self, model=branch), items)
            self.filter_score_mutate_accumulator(
                await build_add_staging_selected(self, model=branch), items,
            )
            # git reset .
            self.filter_score_mutate_accumulator(await build_reset_all(self, model=branch), items)
            self.filter_score_mutate_accumulator(
                await build_reset_selected(self, model=branch),
                items,
            )

            # git checkout
            self.filter_score_mutate_accumulator(
                await build_checkout_files_application(self, model=branch),
                items,
            )

            files = sorted(
                [f for f in File.load_all(project=project) if f.staged],
                key=lambda f: f.name,
            )
            # git commit
            self.filter_score_mutate_accumulator(
                await build_commit_files(self, model=branch, files=files), items,
            )

            # git branch -d
            self.filter_score_mutate_accumulator(await build_delete_branch(branch, items), items)

            # git pull
            self.filter_score_mutate_accumulator(await build_pull(branch, items), items)

            # git push
            self.filter_score_mutate_accumulator(await build_push(branch, items), items)

            # git rebase
            self.filter_score_mutate_accumulator(await build_rebase(branch, items), items)

            # git merge
            self.filter_score_mutate_accumulator(await build_merge(branch, items), items)

        for item in items:
            if 'metadata' not in item:
                item['metadata'] = {}
            item['metadata'].update(branch_metadata(branch))

        return items

    def score_item(self, item_dict: Dict, score: int = None) -> int:
        item_type = item_dict.get('item_type')
        object_type = item_dict.get('object_type')

        if item_dict.get('application') and \
                ApplicationType.EXPANSION == item_dict.get('application').get('application_type'):

            return 10
        elif ObjectType.VERSION_CONTROL_FILE == object_type:
            if ItemType.ACTION == item_type:
                return 5
        elif ObjectType.BRANCH == object_type:
            if ItemType.DELETE == item_type:
                return 0
            return 3
