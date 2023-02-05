from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.FilePresenter import FilePresenter


class FilePolicy(BasePolicy):
    pass


FilePolicy.allow_actions([
    constants.CREATE,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
])

FilePolicy.allow_read([] + FilePresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.LIST,
])

FilePolicy.allow_write([
    'dir_path',
    'name',
    'overwrite',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
])
