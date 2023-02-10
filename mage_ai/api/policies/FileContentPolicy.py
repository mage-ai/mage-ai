from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.FileContentPresenter import FileContentPresenter


class FileContentPolicy(BasePolicy):
    pass


FileContentPolicy.allow_actions([
    constants.READ,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
])

FileContentPolicy.allow_read([] + FileContentPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.READ,
    constants.UPDATE,
])

FileContentPolicy.allow_write([
    'content',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
])
