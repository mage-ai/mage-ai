import inspect
from typing import Dict

from mage_ai.api.operations.constants import OperationType
from mage_ai.api.presenters.BasePresenter import BasePresenter


class ExecutionFrameworkPresenter(BasePresenter):
    default_attributes = [
        'blocks',
        'description',
        'groups',
        'name',
        'type',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        display_format = kwargs.get('format')
        model = self.resource.model

        if model and inspect.isawaitable(model):
            model = await model
        return model.to_dict(
            ignore_empty=True,
            include_templates=OperationType.DETAIL == display_format,
        )


ExecutionFrameworkPresenter.register_format(
    OperationType.DETAIL,
    ExecutionFrameworkPresenter.default_attributes
    + [
        'pipelines',
    ],
)
