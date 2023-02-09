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
        'username',
    ]


UserPresenter.register_format(
    constants.CREATE, UserPresenter.default_attributes + ['token', ])
