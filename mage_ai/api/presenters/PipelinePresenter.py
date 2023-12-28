from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.data_preparation.models.constants import (
    DATAFRAME_SAMPLE_COUNT_PREVIEW,
    PipelineType,
)
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID


class PipelinePresenter(BasePresenter):
    default_attributes = [
        'blocks',
        'cache_block_output_in_memory',
        'concurrency_config',
        'created_at',
        'data_integration',
        'description',
        'executor_config',
        'executor_count',
        'executor_type',
        'name',
        'notification_config',
        'remote_variables_dir',
        'retry_config',
        'run_pipeline_in_one_process',
        'settings',
        'spark_config',
        'tags',
        'type',
        'updated_at',
        'uuid',
        'variables',
        'variables_dir',
        'widgets',
    ]

    async def present(self, **kwargs):
        query = kwargs.get('query', {})
        display_format = kwargs['format']

        include_extensions = query.get('includes_extensions', [True])
        if include_extensions:
            include_extensions = include_extensions[0]

        if constants.DETAIL == display_format:
            include_block_pipelines = query.get('include_block_pipelines', [False])
            if include_block_pipelines:
                include_block_pipelines = include_block_pipelines[0]

            include_content = query.get('includes_content', [True])
            if include_content:
                include_content = include_content[0]

            include_outputs = query.get('includes_outputs', [True])
            if include_outputs:
                include_outputs = include_outputs[0]

            include_outputs_spark = query.get('includes_outputs_spark', [False])
            if include_outputs_spark:
                include_outputs_spark = include_outputs_spark[0]

            include_block_metadata = query.get('includes_block_metadata', [True])
            if include_block_metadata:
                include_block_metadata = include_block_metadata[0]

            include_block_catalog = PipelineType.PYTHON == self.model.type and \
                Project(self.model.repo_config).is_feature_enabled(
                    FeatureUUID.DATA_INTEGRATION_IN_BATCH_PIPELINE,
                )

            return await self.model.to_dict_async(
                include_block_catalog=include_block_catalog,
                include_block_metadata=include_block_metadata,
                include_block_pipelines=include_block_pipelines,
                include_block_tags=True,
                include_callback_blocks=True,
                include_conditional_blocks=True,
                include_content=include_content,
                include_extensions=include_extensions,
                include_outputs=include_outputs,
                include_outputs_spark=include_outputs_spark,
                sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
            )
        elif constants.UPDATE == display_format:
            data = self.model.to_dict(include_extensions=include_extensions)
        else:
            data = self.model.to_dict()
            if self.model.history:
                data.update(history=[h.to_dict() for h in self.model.history])

        include_schedules = query.get('include_schedules', [False])
        if include_schedules:
            include_schedules = include_schedules[0]

        if include_schedules:
            data['schedules'] = self.model.schedules

        return data


PipelinePresenter.register_format(
    constants.LIST,
    PipelinePresenter.default_attributes + [
        'schedules',
    ],
)
