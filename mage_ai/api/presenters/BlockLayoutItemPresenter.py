from mage_ai.api.presenters.BasePresenter import BasePresenter


class BlockLayoutItemPresenter(BasePresenter):
    default_attributes = [
        'configuration',
        'data',
        'data_source',
        'name',
        'type',
        'uuid',
    ]
