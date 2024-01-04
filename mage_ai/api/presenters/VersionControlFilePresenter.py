from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class VersionControlFilePresenter(BasePresenter):
    default_attributes = [
        'additions',
        'content',
        'deletions',
        'diff',
        'file_path',
        'name',
        'output',
        'project_uuid',
        'repo_path',
        'staged',
        'unstaged',
        'untracked',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict()
