from mage_ai.api.presenters.BasePresenter import BasePresenter


class OutputPresenter(BasePresenter):
    default_attributes = [
        'sample_data',
        'shape',
        'type',
        'variable_uuid',
    ]
