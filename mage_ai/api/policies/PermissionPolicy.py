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
    'conditions',
    'entity_names',
    'entity_types',
    'query_attributes',
    'read_attributes',
    'write_attributes',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DELETE,
    constants.DETAIL,
    constants.LIST,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())


PermissionPolicy.allow_read(PermissionPresenter.default_attributes + [
    'role',
    'roles',
    'user',
    'user_id',
    'users',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DELETE,
    constants.DETAIL,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())


PermissionPolicy.allow_write([
    'access',
    'conditions',
    'entity',
    'entity_id',
    'entity_name',
    'entity_type',
    'query_attributes',
    'read_attributes',
    'role_id',
    'role_ids',
    'write_attributes',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_admin_role())


PermissionPolicy.allow_query([
    'only_entity_options',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())
