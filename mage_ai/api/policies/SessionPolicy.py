from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.orchestration.db.models.oauth import Permission


class SessionPolicy(BasePolicy):
    @property
    def entity(self):
        return Permission.Entity.ANY, None


SessionPolicy.allow_actions([
    constants.CREATE,
], scopes=[
    OauthScope.CLIENT_PUBLIC,
])

SessionPolicy.allow_actions([
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

SessionPolicy.allow_read([
    'expires',
    'token',
    'user',
], scopes=[
    OauthScope.CLIENT_PUBLIC,
], on_action=[
    constants.CREATE,
])

SessionPolicy.allow_read([
    'expires',
    'token',
    'user',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

SessionPolicy.allow_write([
    'email',
    'password',
    'username',
], scopes=[
    OauthScope.CLIENT_PUBLIC,
], on_action=[
    constants.CREATE,
])
