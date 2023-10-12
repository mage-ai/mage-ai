from typing import Dict

from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.shared.hash import merge_dict


class UserPresenter(BasePresenter):
    default_attributes = [
        'avatar',
        'created_at',
        'email',
        'first_name',
        'id',
        'last_name',
        'owner',
        'project_access',
        'roles',
        'roles_display',
        'roles_new',
        'updated_at',
        'username',
    ]

    async def present(self, present_options_by_key: Dict = None, **kwargs):
        options = {}

        display_format = kwargs['format']

        if display_format in [
            constants.CREATE,
            constants.DELETE,
            constants.DETAIL,
            constants.UPDATE,
        ]:
            if all([p.user_id == self.current_user.id for p in self.resource.permissions]):
                options['ignore_permissions'] = True

        return await super().present(
            present_options_by_key={},
            **merge_dict(kwargs, options),
        )


UserPresenter.register_formats([
    constants.CREATE,
    constants.DELETE,
    constants.DETAIL,
    constants.UPDATE,
], UserPresenter.default_attributes + [
    'permissions',
    'token',
])


UserPresenter.register_formats([
    f'permission/{constants.DETAIL}',
    f'role/{constants.DETAIL}',
    f'role/{constants.LIST}',
], [
    'first_name',
    'id',
    'last_name',
    'username',
])
