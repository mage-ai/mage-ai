from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.StatusPresenter import StatusPresenter


class StatusPolicy(BasePolicy):
    pass


StatusPolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
    OauthScope.CLIENT_PUBLIC,
])

StatusPolicy.allow_read(StatusPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
    OauthScope.CLIENT_PUBLIC,
], on_action=[
    constants.LIST,
])
