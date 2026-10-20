from mage_ai.api.presenters.BasePresenter import BasePresenter


class LlmPresenter(BasePresenter):
    default_attributes = [
        'use_case',
        'response',
    ]
