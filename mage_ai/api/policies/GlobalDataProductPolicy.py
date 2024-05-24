from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.GlobalDataProductPresenter import GlobalDataProductPresenter


class GlobalDataProductPolicy(BasePolicy):
    pass


GlobalDataProductPolicy.allow_actions(
    [
        constants.DETAIL,
        constants.LIST,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)


GlobalDataProductPolicy.allow_actions(
    [
        constants.CREATE,
        constants.DELETE,
        constants.UPDATE,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role(),
)


GlobalDataProductPolicy.allow_read(
    GlobalDataProductPresenter.default_attributes + [],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.DETAIL,
        constants.LIST,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)


GlobalDataProductPolicy.allow_read(
    GlobalDataProductPresenter.default_attributes + [],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.CREATE,
        constants.DELETE,
        constants.UPDATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role(),
)


GlobalDataProductPolicy.allow_write(
    GlobalDataProductPresenter.default_attributes + [],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.CREATE,
        constants.DELETE,
        constants.UPDATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role(),
)

GlobalDataProductPolicy.allow_query(
    [
        'current_project',
        'repo_path',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.LIST,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

GlobalDataProductPolicy.allow_query(
    [
        'project',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.DETAIL,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)
