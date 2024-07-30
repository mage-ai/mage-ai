from typing import Dict

from mage_ai.api.operations.constants import OperationType
from mage_ai.api.presenters.BasePresenter import BasePresenter

WRITEABLE_ATTRIBUTES = [
    'cache_block_output_in_memory',
    'concurrency_config',
    'description',
    'execution_framework',
    'executor_config',
    'executor_count',
    'executor_type',
    'name',
    'notification_config',
    'remote_variables_dir',
    'retry_config',
    'run_pipeline_in_one_process',
    'settings',
    'settings',
    'spark_config',
    'tags',
    'type',
    'uuid',
    'variables',
]


class PipelineExecutionFrameworkPresenter(BasePresenter):
    default_attributes = WRITEABLE_ATTRIBUTES + ['blocks']

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
