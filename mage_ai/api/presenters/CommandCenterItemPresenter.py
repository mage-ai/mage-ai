from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class CommandCenterItemPresenter(BasePresenter):
    default_attributes = [
        'items',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        items = self.resource.model.get('items') or []

        return dict(
            items=[i.to_dict() for i in items],
        )
