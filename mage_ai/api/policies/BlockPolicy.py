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
], condition=lambda policy: policy.has_at_least_editor_role())

BlockPolicy.allow_read(BlockPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DELETE,
], condition=lambda policy: policy.has_at_least_editor_role())
