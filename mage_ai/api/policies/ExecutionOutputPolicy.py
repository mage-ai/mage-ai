from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.ExecutionOutputPresenter import ExecutionOutputPresenter


class ExecutionOutputPolicy(BasePolicy):
    pass


ExecutionOutputPolicy.allow_actions(
    [OperationType.DETAIL, OperationType.LIST],
    condition=lambda policy: policy.has_at_least_viewer_role(),
    scopes=[OauthScope.CLIENT_PRIVATE],
)


ExecutionOutputPolicy.allow_actions(
    [OperationType.DELETE],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
    scopes=[OauthScope.CLIENT_PRIVATE],
)


ExecutionOutputPolicy.allow_read(
    ExecutionOutputPresenter.default_attributes,
    condition=lambda policy: policy.has_at_least_viewer_role(),
    on_action=[OperationType.DETAIL, OperationType.LIST],
    scopes=[OauthScope.CLIENT_PRIVATE],
)


ExecutionOutputPolicy.allow_read(
    ExecutionOutputPresenter.default_attributes,
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
    on_action=[OperationType.DELETE],
    scopes=[OauthScope.CLIENT_PRIVATE],
)


ExecutionOutputPolicy.allow_query(
    ['namespace', 'path'],
    condition=lambda policy: policy.has_at_least_viewer_role(),
    on_action=[OperationType.DETAIL, OperationType.DELETE, OperationType.LIST],
    scopes=[OauthScope.CLIENT_PRIVATE],
)


ExecutionOutputPolicy.allow_write(
    ['all'],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
    on_action=[OperationType.DELETE],
    scopes=[OauthScope.CLIENT_PRIVATE],
)
