from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.WorkspacePresenter import WorkspacePresenter
from mage_ai.orchestration.db.models.oauth import Permission


class WorkspacePolicy(BasePolicy):
    @property
    def entity(self):
        return Permission.Entity.GLOBAL, None


WorkspacePolicy.allow_actions([
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_admin_role())

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
], condition=lambda policy: policy.has_at_least_admin_role())

WorkspacePolicy.allow_read(WorkspacePresenter.default_attributes + [
    'error_message',
    'success',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_admin_role())

WorkspacePolicy.allow_write([
    'cluster_type',
    'name',
    'namespace',
    'storage_class_name',
    'service_account_name',
    'container_config',
    'cluster_name',
    'task_definition',
    'container_name',
    'project_id',
    'path_to_credentials',
    'region',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.UPDATE,
], condition=lambda policy: policy.is_owner())

WorkspacePolicy.allow_query([
    'cluster_type',
    'user_id',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
    constants.LIST,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_admin_role())
