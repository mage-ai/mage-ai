from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class EventRulePresenter(BasePresenter):
    default_attributes = [
        'rules',
    ]
