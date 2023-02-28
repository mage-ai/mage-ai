from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy


class SyncPolicy(BasePolicy):
    pass


SyncPolicy.allow_read([
    'type',
    'remote_repo_link',
    'repo_path',
    'branch',
    'sync_on_pipeline_run',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

SyncPolicy.allow_write([
    'type',
    'remote_repo_link',
    'repo_path',
    'branch',
    'sync_on_pipeline_run',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role())

SyncPolicy.allow_write([
    'action_type',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())
