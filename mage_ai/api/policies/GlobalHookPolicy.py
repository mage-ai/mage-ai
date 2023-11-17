from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.GlobalHookPresenter import GlobalHookPresenter


class GlobalHookPolicy(BasePolicy):
    pass


GlobalHookPolicy.allow_actions(
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
    condition=lambda policy: policy.has_at_least_admin_role(),
    override_permission_condition=lambda _policy: True,
)


GlobalHookPolicy.allow_read(
    GlobalHookPresenter.default_attributes,
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
    condition=lambda policy: policy.has_at_least_admin_role(),
    override_permission_condition=lambda _policy: True,
)


GlobalHookPolicy.allow_write(
    [
        'conditions',
        'operation_type',
        'output_block_uuids',
        'pipeline_uuid',
        'resource_type',
        'stages',
        'strategies',
        'uuid',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.CREATE,
    ],
    condition=lambda policy: policy.has_at_least_admin_role(),
    override_permission_condition=lambda _policy: True,
)


GlobalHookPolicy.allow_write(
    [
        'conditions',
        'operation_type',
        'output_block_uuids',
        'pipeline_uuid',
        'resource_type',
        'stages',
        'strategies',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.UPDATE,
    ],
    condition=lambda policy: policy.has_at_least_admin_role(),
    override_permission_condition=lambda _policy: True,
)


GlobalHookPolicy.allow_query(
    [
        'operations[]',
        'resources[]',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.LIST,
    ],
    condition=lambda policy: policy.has_at_least_admin_role(),
    override_permission_condition=lambda _policy: True,
)


GlobalHookPolicy.allow_query(
    [
        'operation_type',
        'resource_type',
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
    condition=lambda policy: policy.has_at_least_admin_role(),
    override_permission_condition=lambda _policy: True,
)
