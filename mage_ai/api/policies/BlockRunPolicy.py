from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.BlockRunPresenter import BlockRunPresenter


class BlockRunPolicy(BasePolicy):
    pass


BlockRunPolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

BlockRunPolicy.allow_read(BlockRunPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

BlockRunPolicy.allow_query([
    'pipeline_run_id',
    'pipeline_uuid',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())
