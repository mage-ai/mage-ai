from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.api.presenters.mixins.users import AssociatedUserPresenter


class SessionPresenter(BasePresenter, AssociatedUserPresenter):
    default_attributes = [
        'expires',
        'token',
        'user',
    ]
