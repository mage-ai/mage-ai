from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class VersionControlFilePresenter(BasePresenter):
    default_attributes = [
        'diff',
        'name',
        'project_uuid',
        'repo_path',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict()
