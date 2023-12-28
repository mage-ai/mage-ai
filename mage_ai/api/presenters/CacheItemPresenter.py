from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class CacheItemPresenter(BasePresenter):
    default_attributes = [
        'item',
        'item_type',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict()
