from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter


class IntegrationDestinationPresenter(BasePresenter):
    default_attributes = [
        'name',
        'templates',
        'uuid',
    ]


IntegrationDestinationPresenter.register_format(
    constants.CREATE,
    [
        'error_message',
        'success',
    ],
)
