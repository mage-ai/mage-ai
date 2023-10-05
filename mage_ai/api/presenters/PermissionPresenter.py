from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class PermissionPresenter(BasePresenter):
    default_attributes = [
        'access',
        'created_at',
        'entity',
        'entity_id',
        'entity_name',
        'entity_type',
        'id',
        'updated_at',
    ]


PermissionPresenter.register_format(
    f'role/{constants.DETAIL}',
    PermissionPresenter.default_attributes + [
        'query_attributes',
        'read_attributes',
        'write_attributes',
    ],
)


PermissionPresenter.register_formats([
    constants.CREATE,
    constants.DETAIL,
    constants.UPDATE,
], PermissionPresenter.default_attributes + [
        'query_attributes',
        'read_attributes',
        'role',
        'roles',
        'user_id',
        'write_attributes',
    ],
)
