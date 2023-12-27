from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class CommandCenterItemPresenter(BasePresenter):
    default_attributes = [
        'actions',
        'description',
        'items',
        'metadata',
        'title',
        'type',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict()
