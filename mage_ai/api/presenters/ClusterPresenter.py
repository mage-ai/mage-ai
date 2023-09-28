from mage_ai.api.presenters.BasePresenter import BasePresenter


class ClusterPresenter(BasePresenter):
    default_attributes = [
        'clusters',
        'id',
        'success',
        'type',
    ]
