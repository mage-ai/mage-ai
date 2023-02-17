from mage_ai.api.presenters.BasePresenter import BasePresenter


class VariablePresenter(BasePresenter):
    default_attributes = [
        'block',
        'name',
        'pipeline',
        'value',
        'variables',
    ]
