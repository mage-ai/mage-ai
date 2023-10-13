from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class RolePresenter(BasePresenter):
    default_attributes = [
        'created_at',
        'id',
        'name',
        'permissions',
        'role_permissions',
        'updated_at',
        'user',
    ]


RolePresenter.register_format(
    constants.CREATE,
    [
        'created_at',
        'id',
        'name',
        'updated_at',
        'user_id',
    ],
)


RolePresenter.register_formats([
    constants.DETAIL,
    constants.CREATE,
    constants.UPDATE,
    constants.DELETE,
], RolePresenter.default_attributes + [
    'users',
])


RolePresenter.register_formats([
    f'permission/{constants.CREATE}',
    f'permission/{constants.DETAIL}',
    f'permission/{constants.UPDATE}',
], [
    'created_at',
    'id',
    'name',
    'updated_at',
    'users',
])


RolePresenter.register_formats([
    f'user/{constants.CREATE}',
    f'user/{constants.DELETE}',
    f'user/{constants.DETAIL}',
    f'user/{constants.LIST}',
    f'user/{constants.UPDATE}',
], [
    'created_at',
    'id',
    'name',
    'permissions',
    'updated_at',
])
