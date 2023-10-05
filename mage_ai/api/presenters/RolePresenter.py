from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class RolePresenter(BasePresenter):
    default_attributes = [
        'created_at',
        'id',
        'name',
        'permissions',
        'updated_at',
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


RolePresenter.register_format(
    constants.DETAIL,
    RolePresenter.default_attributes + [
        'users',
    ],
)
