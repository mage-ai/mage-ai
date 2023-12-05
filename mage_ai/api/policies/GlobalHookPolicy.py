from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.GlobalHookPresenter import GlobalHookPresenter

WRITEABLE_ATTRIBUTES = [
    'conditions',
    'operation_type',
    'outputs',
    'pipeline',
    'predicate',
    'resource_type',
    'run_settings',
    'stages',
    'strategies',
]


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
    GlobalHookPresenter.default_attributes + [
        'operation_types',
        'pipeline_details',
        'resource_types',
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


GlobalHookPolicy.allow_write(
    WRITEABLE_ATTRIBUTES + [
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
    WRITEABLE_ATTRIBUTES + [
        'snapshot',
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
        'include_snapshot_validation',
        'operation_type[]',
        'resource_type[]',
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
        'include_operation_types',
        'include_resource_types',
        'include_snapshot_validation',
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
        OperationType.UPDATE,
    ],
    condition=lambda policy: policy.has_at_least_admin_role(),
    override_permission_condition=lambda _policy: True,
)
