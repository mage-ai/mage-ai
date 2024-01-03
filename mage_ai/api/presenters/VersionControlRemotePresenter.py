from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class VersionControlRemotePresenter(BasePresenter):
    default_attributes = [
        'name',
        'output',
        'project_uuid',
        'repo_path',
        'url',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict()
