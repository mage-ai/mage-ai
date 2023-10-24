from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.UserPresenter import UserPresenter


class UserPolicy(BasePolicy):
    def is_current_user(self) -> bool:
        return self.current_user.owner or self.current_user.id == self.resource.id


UserPolicy.allow_actions([
    constants.CREATE,
    constants.DELETE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.is_owner())


UserPolicy.allow_actions([
    constants.DETAIL,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.is_current_user() or policy.has_at_least_admin_role())


UserPolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_admin_role())


UserPolicy.allow_read(UserPresenter.default_attributes + [
    'permissions',
    'token',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
    constants.UPDATE,
], condition=lambda policy: policy.is_current_user() or policy.has_at_least_admin_role())


UserPolicy.allow_read(UserPresenter.default_attributes + [
    'permissions',
    'token',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DELETE,
])


UserPolicy.allow_read(UserPresenter.default_attributes + [
    'permissions',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_admin_role())


UserPolicy.allow_write([
    'avatar',
    'email',
    'first_name',
    'last_name',
    'password',
    'password_confirmation',
    'password_current',
    'username',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.is_current_user() or policy.has_at_least_admin_role())


UserPolicy.allow_write([
    'role_ids',
    'roles',
    'roles_new',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DELETE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_admin_role())


UserPolicy.allow_write([
    'owner',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.is_owner())


UserPolicy.allow_write([
    'avatar',
    'email',
    'first_name',
    'last_name',
    'password',
    'password_confirmation',
    'role_ids',
    'roles',
    'roles_new',
    'username',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.is_owner())
