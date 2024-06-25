from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class ExecutionOutputPresenter(BasePresenter):
    default_attributes = [
        'absolute_path',
        'environment',
        'messages',
        'namespace',
        'output',
        'path',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict(ignore_empty=True)
