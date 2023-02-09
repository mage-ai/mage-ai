from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.UserPresenter import UserPresenter


class UserPolicy(BasePolicy):
    def is_current_user(self):
        return self.current_user.owner or self.current_user.id == self.resource.id


UserPolicy.allow_actions([
    constants.CREATE,
], scopes=[
    OauthScope.CLIENT_PUBLIC,
])

UserPolicy.allow_actions([
    constants.DETAIL,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.is_current_user())

UserPolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.is_owner())

UserPolicy.allow_read(UserPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.is_current_user())

UserPolicy.allow_read(UserPresenter.default_attributes + [
    'token',
], scopes=[
    OauthScope.CLIENT_PUBLIC,
], on_action=[
    constants.CREATE,
])

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
], condition=lambda policy: policy.is_current_user())

UserPolicy.allow_write([
    'avatar',
    'email',
    'first_name',
    'last_name',
    'password',
    'password_confirmation',
    'username',
], scopes=[
    OauthScope.CLIENT_PUBLIC,
], on_action=[
    constants.CREATE,
])
