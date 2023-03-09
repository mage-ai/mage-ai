from mage_ai.api.presenters.BasePresenter import BasePresenter


class FileVersionPresenter(BasePresenter):
    default_attributes = [
        'name',
        'path',
    ]

    def present(self, **kwargs):
        return self.model.to_dict()
