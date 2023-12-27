from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class CommandCenterItemPresenter(BasePresenter):
    default_attributes = [
        'items',
        'settings',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        items = self.resource.model.get('items') or []
        settings = self.resource.model.get('settings')

        return dict(
            items=[i.to_dict() for i in items],
            settings=settings.to_dict() if settings else None,
        )
