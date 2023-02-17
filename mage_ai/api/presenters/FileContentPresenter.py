from mage_ai.api.presenters.BasePresenter import BasePresenter


class FileContentPresenter(BasePresenter):
    default_attributes = [
        'content',
        'name',
        'path',
    ]

    def present(self, **kwargs):
        return self.model.to_dict(include_content=True)
