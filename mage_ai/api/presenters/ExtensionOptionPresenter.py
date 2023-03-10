from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class ExtensionOptionPresenter(BasePresenter):
    default_attributes = [
        'description',
        'name',
        'templates',
        'uuid',
    ]
