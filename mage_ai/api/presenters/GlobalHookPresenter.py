from typing import Dict

from mage_ai.api.operations.constants import OperationType
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.data_preparation.models.global_hooks.constants import RESOURCE_TYPES
from mage_ai.data_preparation.models.global_hooks.models import HookOperation


class GlobalHookPresenter(BasePresenter):
    default_attributes = [
        'conditions',
        'metadata',
        'operation_type',
        'outputs',
        'pipeline',
        'predicate',
        'resource_type',
        'run_settings',
        'stages',
        'strategies',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        query = kwargs.get('query') or {}

        data = {}
        if self.resource.model:
            include_snapshot_validation = False
            if 'include_snapshot_validation' in query:
                include_snapshot_validation = True

            data = self.resource.model.to_dict(
                include_all=True,
                include_snapshot_validation=include_snapshot_validation,
            )

        display_format = kwargs.get('format')
        if 'with_pipeline_details' == display_format:
            data['pipeline_details'] = await self.pipeline_details(**kwargs)

        if 'include_operation_types' in query:
            data['operation_types'] = [m.value for m in HookOperation]

        if 'include_resource_types' in query:
            data['resource_types'] = RESOURCE_TYPES

        return data

    async def pipeline_details(self, **kwargs) -> Dict:
        if self.resource.model.pipeline_settings and \
                self.resource.model.pipeline_settings.get('uuid'):

            pipeline = await self.resource.pipeline
            pipeline_dict = await pipeline.to_dict_async()
            return pipeline_dict


GlobalHookPresenter.register_format(
    'with_pipeline_details',
    GlobalHookPresenter.default_attributes + [
        'pipeline_details',
    ],
)


GlobalHookPresenter.register_format(
    OperationType.DETAIL,
    GlobalHookPresenter.default_attributes + [
        'operation_types',
        'pipeline_details',
        'resource_types',
    ],
)
