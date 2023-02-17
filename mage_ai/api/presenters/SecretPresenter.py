from mage_ai.api.presenters.BasePresenter import BasePresenter


class SecretPresenter(BasePresenter):
    default_attributes = [
        'id',
        'name',
    ]
