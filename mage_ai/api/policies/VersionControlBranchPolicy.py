from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.VersionControlBranchPresenter import (
    VersionControlBranchPresenter,
)


class VersionControlBranchPolicy(BasePolicy):
    pass


VersionControlBranchPolicy.allow_actions(
    [
        OperationType.CREATE,
        OperationType.DELETE,
        OperationType.DETAIL,
        OperationType.LIST,
        OperationType.UPDATE,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role(),
    override_permission_condition=lambda _policy: True,
)


VersionControlBranchPolicy.allow_read(
    VersionControlBranchPresenter.default_attributes + [],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.CREATE,
        OperationType.DELETE,
        OperationType.DETAIL,
        OperationType.LIST,
        OperationType.UPDATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role(),
    override_permission_condition=lambda _policy: True,
)


VersionControlBranchPolicy.allow_write(
    [
        'clone',
        'name',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.CREATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role(),
    override_permission_condition=lambda _policy: True,
)


VersionControlBranchPolicy.allow_write(
    [
        'checkout',
        'clone',
        'merge',
        'pull',
        'push',
        'rebase',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.UPDATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role(),
    override_permission_condition=lambda _policy: True,
)


VersionControlBranchPolicy.allow_query(
    [
        'log',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.DETAIL,
    ],
    condition=lambda policy: policy.has_at_least_editor_role(),
    override_permission_condition=lambda _policy: True,
)


VersionControlBranchPolicy.allow_query(
    [
        'log',
        'force',
        'remote',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.CREATE,
        OperationType.DELETE,
        OperationType.DETAIL,
        OperationType.LIST,
        OperationType.UPDATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role(),
    override_permission_condition=lambda _policy: True,
)
