from mage_ai.api.presenters.BasePresenter import BasePresenter


class OauthPresenter(BasePresenter):
    default_attributes = [
        'authenticated',
        'expires',
        'provider',
        'url',
    ]
