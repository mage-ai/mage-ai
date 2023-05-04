from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.FileContentPresenter import FileContentPresenter


class FileContentPolicy(BasePolicy):
    pass


FileContentPolicy.allow_actions([
    constants.DETAIL,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

FileContentPolicy.allow_actions([
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

FileContentPolicy.allow_read(FileContentPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
    constants.UPDATE,
])

FileContentPolicy.allow_write([
    'content',
    'name',
    'path',
    'version',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())
