from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class KernelProcessPresenter(BasePresenter):
    default_attributes = [
        'active',
        'num_processes',
        'processes',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict()
