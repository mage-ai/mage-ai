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
        return self.resource.model.to_dict()
