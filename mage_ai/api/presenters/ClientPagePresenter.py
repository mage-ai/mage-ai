from mage_ai.api.presenters.BasePresenter import BasePresenter


class ClientPagePresenter(BasePresenter):
    default_attributes = [
        'category',
        'components',
        'disabled',
        'operation',
        'parent',
        'resource',
        'uuid',
        'version',
    ]

    async def present(self, **kwargs):
        return self.model.to_dict(user=self.current_user)
