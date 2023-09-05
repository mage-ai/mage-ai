from mage_ai.api.presenters.BasePresenter import BasePresenter


class PageBlockLayoutPresenter(BasePresenter):
    default_attributes = [
        'blocks',
        'layout',
        'uuid',
    ]

    def present(self, **kwargs):
        return self.resource.model.to_dict()
