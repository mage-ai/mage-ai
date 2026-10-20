from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.GitFilePresenter import GitFilePresenter


class GitFilePolicy(BasePolicy):
    pass


GitFilePolicy.allow_actions([
    constants.DETAIL,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())


GitFilePolicy.allow_read(GitFilePresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())


GitFilePolicy.allow_query([
    'base_branch',
    'compare_branch',
    'derive',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())
