from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class CustomDesignPresenter(BasePresenter):
    default_attributes = [
        'components',
        'pages',
        'project',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict()
