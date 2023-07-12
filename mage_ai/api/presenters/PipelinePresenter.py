from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.data_preparation.models.constants import DATAFRAME_SAMPLE_COUNT_PREVIEW


class PipelinePresenter(BasePresenter):
    default_attributes = [
        'blocks',
        'data_integration',
        'description',
        'executor_config',
        'executor_count',
        'executor_type',
        'name',
        'notification_config',
        'retry_config',
        'spark_config',
        'tags',
        'type',
        'updated_at',
        'uuid',
        'variables',
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

            include_block_metadata = query.get('includes_block_metadata', [True])
            if include_block_metadata:
                include_block_metadata = include_block_metadata[0]

            return await self.model.to_dict_async(
                include_block_metadata=include_block_metadata,
                include_block_pipelines=include_block_pipelines,
                include_block_tags=True,
                include_callback_blocks=True,
                include_conditional_blocks=True,
                include_content=include_content,
                include_extensions=include_extensions,
                include_outputs=include_outputs,
                sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
            )
        elif constants.UPDATE == display_format:
            data = self.model.to_dict(include_extensions=include_extensions)
        else:
            data = self.model.to_dict()

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
