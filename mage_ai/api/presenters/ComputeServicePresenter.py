from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class ComputeServicePresenter(BasePresenter):
    default_attributes = [
        'connection_credentials',
        'clusters',
        'setup_steps',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict()
