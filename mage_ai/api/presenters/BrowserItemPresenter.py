from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class BrowserItemPresenter(BasePresenter):
    default_attributes = [
        'extension',
        'modified_timestamp',
        'name',
        'path',
        'relative_path',
        'size',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model
