from mage_ai.api.presenters.BasePresenter import BasePresenter


class FilePresenter(BasePresenter):
    default_attributes = [
        'children',
        'disabled',
        'name',
        'path',
    ]

    def present(self, **kwargs):
        if type(self.model) is dict:
            return self.model

        return self.model.to_dict()
