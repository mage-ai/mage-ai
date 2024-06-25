from typing import Dict

from mage_ai.api.operations.constants import OperationType
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.api.presenters.PipelinePresenter import PipelinePresenter


class PipelineExecutionFrameworkPresenter(BasePresenter):
    default_attributes = [
        *PipelinePresenter.default_attributes,
        'execution_framework',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return await self.resource.model.to_dict_async(include_execution_framework=True)


PipelineExecutionFrameworkPresenter.register_formats(
    [
        OperationType.DETAIL,
        OperationType.UPDATE,
    ],
    PipelineExecutionFrameworkPresenter.default_attributes
    + [
        'pipelines',
    ],
)
