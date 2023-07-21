from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


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

        if constants.DETAIL == kwargs.get('format'):
            data['content'] = self.resource.model.load_template_content()

        return data


CustomTemplatePresenter.register_formats([
    constants.DETAIL,
], CustomTemplatePresenter.default_attributes + [
        'content',
    ],
)
