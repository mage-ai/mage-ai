from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.OauthPresenter import OauthPresenter


class OauthPolicy(BasePolicy):
    pass


OauthPolicy.allow_actions([
    constants.CREATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())


OauthPolicy.allow_actions([
    constants.DETAIL,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
    OauthScope.CLIENT_PUBLIC,
], condition=lambda policy: policy.has_at_least_viewer_role())


OauthPolicy.allow_read(OauthPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_viewer_role())


OauthPolicy.allow_read(OauthPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
    OauthScope.CLIENT_PUBLIC,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())


OauthPolicy.allow_write([
    'provider',
    'token',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_viewer_role())


OauthPolicy.allow_query([
    'redirect_uri',
], on_action=[
    constants.DETAIL,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
    OauthScope.CLIENT_PUBLIC,
], condition=lambda policy: policy.has_at_least_viewer_role())
