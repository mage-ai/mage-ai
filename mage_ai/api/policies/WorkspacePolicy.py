from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.WorkspacePresenter import WorkspacePresenter


class WorkspacePolicy(BasePolicy):
    pass


WorkspacePolicy.allow_actions([
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

WorkspacePolicy.allow_actions([
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.is_owner())

WorkspacePolicy.allow_read(WorkspacePresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

WorkspacePolicy.allow_read(WorkspacePresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_admin_role())

WorkspacePolicy.allow_write([
    'cluster_name',
    'cluster_type',
    'container_config',
    'container_name',
    'lifecycle_config',
    'name',
    'namespace',
    'path_to_credentials',
    'project_id',
    'region',
    'storage_class_name',
    'service_account_name',
    'storage_access_mode',
    'storage_request_size',
    'task_definition',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.UPDATE,
], condition=lambda policy: policy.is_owner())

WorkspacePolicy.allow_query([
    'namespace[]',
    'cluster_type',
    'user_id',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

WorkspacePolicy.allow_query([
    'cluster_type',
    'user_id',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())
