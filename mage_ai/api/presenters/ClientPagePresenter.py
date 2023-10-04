from mage_ai.api.presenters.BasePresenter import BasePresenter


class ClientPagePresenter(BasePresenter):
    default_attributes = [
        'category',
        'components',
        'disabled',
        'metadata',
        'operation',
        'parent',
        'resource',
        'uuid',
        'version',
    ]

    async def present(self, **kwargs):
        return await self.model.to_dict(
            current_user=self.current_user,
            **(self.resource.result_set().context.data.get('resources') or {}),
        )
