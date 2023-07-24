from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.data_preparation.models.custom_templates.custom_block_template import (
    CustomBlockTemplate,
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

    def present(self, **kwargs):
        data = self.resource.model.to_dict()

        if isinstance(self.resource.model, CustomBlockTemplate):
            if kwargs.get('format') in [constants.DETAIL, constants.UPDATE]:
                data['content'] = self.resource.model.load_template_content()

        return data


CustomTemplatePresenter.register_formats([
    constants.DETAIL,
    constants.UPDATE,
], CustomTemplatePresenter.default_attributes + [
        'content',
    ],
)
