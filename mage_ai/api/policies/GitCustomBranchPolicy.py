from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.GitBranchPolicy import GitBranchPolicy
from mage_ai.api.presenters.GitBranchPresenter import GitBranchPresenter


class GitCustomBranchPolicy(GitBranchPolicy):
    pass


GitCustomBranchPolicy.allow_actions([
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

GitCustomBranchPolicy.allow_actions([
    constants.CREATE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role())

GitCustomBranchPolicy.allow_read(GitBranchPresenter.default_attributes + [
    'logs',
    'remotes',
    'access_token_exists',
], scopes=[
    OauthScope.CLIENT_PRIVATE
], on_action=[
    constants.CREATE,
    constants.DETAIL,
    constants.LIST,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

GitCustomBranchPolicy.allow_write(GitBranchPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role())

GitCustomBranchPolicy.allow_write(GitBranchPresenter.default_attributes + [
    'clone',
    'delete',
    'fetch',
    'merge',
    'pull',
    'push',
    'rebase',
    'remote',
    'reset',
], scopes=[
    OauthScope.CLIENT_PRIVATE
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())

GitCustomBranchPolicy.allow_query([
    'include_remote_branches',
    'repository',
    'remote_url',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())
