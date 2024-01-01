from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.VersionControlRemotePresenter import (
    VersionControlRemotePresenter,
)


class VersionControlRemotePolicy(BasePolicy):
    pass


VersionControlRemotePolicy.allow_actions(
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


VersionControlRemotePolicy.allow_read(
    VersionControlRemotePresenter.default_attributes + [],
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


VersionControlRemotePolicy.allow_write(
    [
        'name',
        'url',
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


VersionControlRemotePolicy.allow_write(
    [
        'fetch',
        'name',
        'set_url',
        'url',
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


VersionControlRemotePolicy.allow_query(
    [],
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
