from mage_ai.api.presenters.BasePresenter import BasePresenter


class FilePresenter(BasePresenter):
    default_attributes = [
        'children',
        'disabled',
        'modified_timestamp',
        'name',
        'path',
        'size',
    ]

    async def prepare_present(self, **kwargs):
        if isinstance(self.model, dict):
            return self.model

        return self.model.to_dict()
