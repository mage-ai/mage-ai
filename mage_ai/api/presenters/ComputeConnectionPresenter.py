from mage_ai.api.presenters.BasePresenter import BasePresenter


class ComputeConnectionPresenter(BasePresenter):
    default_attributes = [
        'actions',
        'active',
        'connection',
        'description',
        'id',
        'name',
    ]
