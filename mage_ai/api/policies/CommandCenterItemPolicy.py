from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.CommandCenterItemPresenter import CommandCenterItemPresenter


class CommandCenterItemPolicy(BasePolicy):
    pass


CommandCenterItemPolicy.allow_actions(
    [
        OperationType.CREATE,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
    override_permission_condition=lambda _policy: True,
)


CommandCenterItemPolicy.allow_read(
    CommandCenterItemPresenter.default_attributes + [],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.CREATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
    override_permission_condition=lambda _policy: True,
)


CommandCenterItemPolicy.allow_write(
    [
        'component',
        'state',
        'timeline',
        'page',
        'page_history',
        'picks',
        'search',
        'search_history',
        'settings',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.CREATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
    override_permission_condition=lambda _policy: True,
)
