from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.data_preparation.models.constants import DATAFRAME_SAMPLE_COUNT_PREVIEW


class PipelinePresenter(BasePresenter):
    default_attributes = [
        'blocks',
        'data_integration',
        'name',
        'type',
        'uuid',
        'widgets',
    ]

    async def present(self, **kwargs):
        query = kwargs.get('query', {})
        include_content = query.get('includes_content', [True])
        if include_content:
            include_content = include_content[0]
        include_outputs = query.get('includes_outputs', [True])
        if include_outputs:
            include_outputs = include_outputs[0]

        return await self.model.to_dict_async(
            include_content=include_content,
            include_outputs=include_outputs,
            sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
        )
