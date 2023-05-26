from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class UserPresenter(BasePresenter):
    default_attributes = [
        'avatar',
        'email',
        'first_name',
        'id',
        'last_name',
        'owner',
        'roles',
        'roles_display',
        'roles_new',
        'project_access',
        'username',
    ]

    def present(self, **kwargs):
        data = self.model.to_dict(include_attributes=self.default_attributes)

        roles_new = self.model.roles_new
        data['roles_new'] = [
            role.to_dict(include_attributes=['permissions'])
            for role in roles_new
        ]

        return data


UserPresenter.register_format(
    constants.CREATE, UserPresenter.default_attributes + ['token', ])
