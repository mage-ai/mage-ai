from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.PermissionPresenter import PermissionPresenter


class PermissionPolicy(BasePolicy):
    pass


PermissionPolicy.allow_actions([
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())


PermissionPolicy.allow_actions([
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_admin_role())


PermissionPolicy.allow_read(PermissionPresenter.default_attributes + [
    'query_attributes',
    'read_attributes',
    'write_attributes',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DETAIL,
    constants.LIST,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())


PermissionPolicy.allow_read(PermissionPresenter.default_attributes + [
    'role',
    'user',
    'user_id',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())


PermissionPolicy.allow_write([
    'access',
    'entity',
    'entity_id',
    'entity_name',
    'entity_type',
    'role_id',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_admin_role())
