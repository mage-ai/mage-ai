from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class ComputeConnectionPresenter(BasePresenter):
    default_attributes = [
        'actions',
        'attributes',
        'connection',
        'description',
        'error',
        'group',
        'name',
        'required',
        'status',
        'steps',
        'tab',
        'target',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict()
