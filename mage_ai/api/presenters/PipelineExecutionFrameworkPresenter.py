from typing import Dict

from mage_ai.api.operations.constants import OperationType
from mage_ai.api.presenters.BasePresenter import BasePresenter


class PipelineExecutionFrameworkPresenter(BasePresenter):
    default_attributes = [
        'blocks',
        'description',
        'execution_framework',
        'name',
        'tags',
        'type',
        'uuid',
        'variables',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        display_format = kwargs.get('format')

        return await self.resource.model.to_dict_async(
            include_framework=display_format in [OperationType.DETAIL],
            include_pipelines=display_format in [OperationType.DETAIL, OperationType.UPDATE],
        )


PipelineExecutionFrameworkPresenter.register_formats(
    [
        OperationType.DETAIL,
    ],
    PipelineExecutionFrameworkPresenter.default_attributes
    + [
        'framework',
        'pipelines',
    ],
)

PipelineExecutionFrameworkPresenter.register_formats(
    [
        OperationType.UPDATE,
    ],
    PipelineExecutionFrameworkPresenter.default_attributes
    + [
        'pipelines',
    ],
)
