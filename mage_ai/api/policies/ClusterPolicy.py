from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.ClusterPresenter import ClusterPresenter


class ClusterPolicy(BasePolicy):
    pass


ClusterPolicy.allow_actions([
    constants.READ,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
])

ClusterPolicy.allow_read(ClusterPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.READ,
    constants.UPDATE,
])

ClusterPolicy.allow_write([
    'id',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
])
