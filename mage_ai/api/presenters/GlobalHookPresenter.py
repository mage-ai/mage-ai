from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class GlobalHookPresenter(BasePresenter):
    default_attributes = [
        'conditions',
        'operation_type',
        'outputs',
        'pipeline',
        'predicates',
        'resource_type',
        'stages',
        'strategies',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict(include_all=True)
