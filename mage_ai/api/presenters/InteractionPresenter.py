from mage_ai.api.presenters.BasePresenter import BasePresenter


class InteractionPresenter(BasePresenter):
    default_attributes = [
        'content',
        'inputs',
        'language',
        'layout',
        'uuid',
        'variables',
    ]

    async def present(self, **kwargs):
        if isinstance(self.model, dict):
            return self.model

        return await self.model.to_dict(include_content=True)
