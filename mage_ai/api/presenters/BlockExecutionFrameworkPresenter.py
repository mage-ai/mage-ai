from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter

WRITEABLE_ATTRIBUTES = [
    'color',
    'configuration',
    'downstream_blocks',
    'executor_config',
    'executor_type',
    'groups',
    'language',
    'name',
    'type',
    'upstream_blocks',
    'uuid',
]


class BlockExecutionFrameworkPresenter(BasePresenter):
    default_attributes = WRITEABLE_ATTRIBUTES + [
        'pipeline',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return await self.resource.model.to_dict_async(include_pipeline=True)
