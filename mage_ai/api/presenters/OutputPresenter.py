from mage_ai.api.presenters.BasePresenter import BasePresenter


class OutputPresenter(BasePresenter):
    default_attributes = [
        'outputs',
        'sample_data',
        'shape',
        'text_data',
        'type',
        'variable_uuid',
    ]
