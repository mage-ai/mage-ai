from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.FilePresenter import FilePresenter


class FilePolicy(BasePolicy):
    pass


FilePolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

FilePolicy.allow_actions([
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

FilePolicy.allow_read(FilePresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

FilePolicy.allow_read(FilePresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

FilePolicy.allow_write([
    'api_key',
    'dir_path',
    'file',
    'name',
    'overwrite',
    'pipeline_zip',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

FilePolicy.allow_write([
    'dir_path',
    'name',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())


FilePolicy.allow_query(
    [
        'exclude_dir_pattern',
        'exclude_pattern',
        'flatten',
        'include_pipeline_count',
        'pattern',
        'project_uuid',
        'repo_path',
        'version_control_files',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.LIST,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
    override_permission_condition=lambda _policy: True,
)
