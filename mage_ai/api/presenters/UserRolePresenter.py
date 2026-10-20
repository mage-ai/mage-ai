from mage_ai.api.presenters.BasePresenter import BasePresenter


class UserRolePresenter(BasePresenter):
    default_attributes = [
        'created_at',
        'id',
        'role_id',
        'updated_at',
        'user_id',
    ]
