from mage_ai.api.presenters.BasePresenter import BasePresenter


class OauthAccessTokenPresenter(BasePresenter):
    default_attributes = [
        'expires',
        'token',
        'user_id',
    ]
