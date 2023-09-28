from mage_ai.api.presenters.BasePresenter import BasePresenter


class TagPresenter(BasePresenter):
    default_attributes = [
        'description',
        'id',
        'name',
        'uuid',
    ]
