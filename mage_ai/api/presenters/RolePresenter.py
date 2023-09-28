from mage_ai.api.presenters.BasePresenter import BasePresenter


class RolePresenter(BasePresenter):
    default_attributes = [
        'id',
        'created_at',
        'name',
        'permissions',
        'updated_at',
    ]

    async def present(self, **kwargs):
        return self.model.to_dict(include_attributes=self.default_attributes)
