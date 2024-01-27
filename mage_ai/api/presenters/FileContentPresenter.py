from mage_ai.api.presenters.BasePresenter import BasePresenter


class FileContentPresenter(BasePresenter):
    default_attributes = [
        'content',
        'modified_timestamp',
        'name',
        'path',
        'size',
    ]

    async def prepare_present(self, **kwargs):
        if isinstance(self.model, dict):
            return self.model

        return await self.model.to_dict_async(include_content=True)
