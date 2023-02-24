from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.data_preparation.models.constants import DATAFRAME_SAMPLE_COUNT_PREVIEW


class PipelinePresenter(BasePresenter):
    default_attributes = [
        'blocks',
        'data_integration',
        'name',
        'type',
        'uuid',
        'variables',
        'widgets',
    ]

    async def present(self, **kwargs):
        query = kwargs.get('query', {})

        if constants.DETAIL == kwargs['format']:
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
                include_content=include_content,
                include_outputs=include_outputs,
                sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
            )

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
