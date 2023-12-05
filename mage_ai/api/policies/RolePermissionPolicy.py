from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.RolePermissionPresenter import RolePermissionPresenter


class RolePermissionPolicy(BasePolicy):
    pass


RolePermissionPolicy.allow_actions([
    constants.CREATE,
    constants.DELETE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_admin_role())


RolePermissionPolicy.allow_read(RolePermissionPresenter.default_attributes + [
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DELETE,
], condition=lambda policy: policy.has_at_least_admin_role())


RolePermissionPolicy.allow_write([
    'permission_id',
    'permission_ids',
    'role_id',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_admin_role())
