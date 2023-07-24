from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.data_preparation.models.constants import DATAFRAME_SAMPLE_COUNT_PREVIEW
from mage_ai.data_preparation.models.custom_templates.custom_block_template import (
    CustomBlockTemplate,
)
from mage_ai.data_preparation.models.custom_templates.custom_pipeline_template import (
    CustomPipelineTemplate,
)


class CustomTemplatePresenter(BasePresenter):
    default_attributes = [
        'block_type',
        'color',
        'configuration',
        'description',
        'language',
        'name',
        'pipeline',
        'tags',
        'template_uuid',
        'user',
        'uuid',
    ]

    async def present(self, **kwargs):
        data = self.resource.model.to_dict()

        if isinstance(self.resource.model, CustomBlockTemplate):
            if kwargs.get('format') in [constants.DETAIL, constants.UPDATE]:
                data['content'] = self.resource.model.load_template_content()
        elif isinstance(self.resource.model, CustomPipelineTemplate):
            if kwargs.get('format') in [constants.DETAIL]:
                pipeline = self.resource.model.build_pipeline()

                data['pipeline'] = await pipeline.to_dict_async(
                    include_block_metadata=True,
                    include_block_pipelines=True,
                    include_block_tags=True,
                    include_callback_blocks=True,
                    include_conditional_blocks=True,
                    include_content=False,
                    include_extensions=True,
                    include_outputs=False,
                    sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
                )

        return data


CustomTemplatePresenter.register_formats([
    constants.DETAIL,
    constants.UPDATE,
], CustomTemplatePresenter.default_attributes + [
        'content',
    ],
)
