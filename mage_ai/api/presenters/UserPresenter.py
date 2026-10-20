from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


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
