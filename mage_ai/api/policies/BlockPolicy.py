from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.BlockPresenter import BlockPresenter


class BlockPolicy(BasePolicy):
    pass


BlockPolicy.allow_actions([
    constants.DELETE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
])

BlockPolicy.allow_read(BlockPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DELETE,
])
