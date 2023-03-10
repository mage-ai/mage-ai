from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy


class GitBranchPolicy(BasePolicy):
    pass


GitBranchPolicy.allow_actions([
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

GitBranchPolicy.allow_actions([
    constants.CREATE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role())

GitBranchPolicy.allow_read([
    'name',
    'status',
], scopes=[
    OauthScope.CLIENT_PRIVATE
], on_action=[
    constants.CREATE,
    constants.DETAIL,
    constants.LIST,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

GitBranchPolicy.allow_write([
    'name',
], scopes=[
    OauthScope.CLIENT_PRIVATE
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role())

GitBranchPolicy.allow_write([
    'name',
    'message'
], scopes=[
    OauthScope.CLIENT_PRIVATE
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())
