from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy


class SessionPolicy(BasePolicy):
    pass


SessionPolicy.allow_actions([
    constants.CREATE,
], scopes=[
    OauthScope.CLIENT_PUBLIC,
])

SessionPolicy.allow_actions([
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
])

SessionPolicy.allow_read([
    'expires',
    'token',
    'user',
], scopes=[
    OauthScope.CLIENT_PUBLIC,
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.UPDATE,
])

SessionPolicy.allow_write([
    'email',
    'password',
    'username',
], scopes=[
    OauthScope.CLIENT_PUBLIC,
], on_action=[
    constants.CREATE,
])
