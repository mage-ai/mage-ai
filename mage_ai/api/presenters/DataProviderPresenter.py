from mage_ai.api.presenters.BasePresenter import BasePresenter


class DataProviderPresenter(BasePresenter):
    default_attributes = [
        'id',
        'profiles',
        'value',
    ]
