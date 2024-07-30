from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.BlockExecutionFrameworkPresenter import (
    WRITEABLE_ATTRIBUTES,
    BlockExecutionFrameworkPresenter,
)
from mage_ai.orchestration.constants import Entity


class BlockExecutionFrameworkPolicy(BasePolicy):
    @property
    def entity(self):
        # Adjust the entity to reflect the KernelProcess's entity, if applicable
        return Entity.ANY, None


BlockExecutionFrameworkPolicy.allow_actions(
    [
        OperationType.DETAIL,
        OperationType.LIST,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

BlockExecutionFrameworkPolicy.allow_actions(
    [
        OperationType.CREATE,
        OperationType.DELETE,
        OperationType.UPDATE,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)


BlockExecutionFrameworkPolicy.allow_read(
    BlockExecutionFrameworkPresenter.default_attributes,
    on_action=[
        OperationType.LIST,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

BlockExecutionFrameworkPolicy.allow_read(
    BlockExecutionFrameworkPresenter.default_attributes,
    on_action=[
        OperationType.DETAIL,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

BlockExecutionFrameworkPolicy.allow_read(
    BlockExecutionFrameworkPresenter.default_attributes,
    on_action=[
        OperationType.CREATE,
        OperationType.DELETE,
        OperationType.UPDATE,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)

BlockExecutionFrameworkPolicy.allow_write(
    WRITEABLE_ATTRIBUTES,
    on_action=[
        OperationType.CREATE,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)

BlockExecutionFrameworkPolicy.allow_write(
    WRITEABLE_ATTRIBUTES,
    on_action=[
        OperationType.UPDATE,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)

BlockExecutionFrameworkPolicy.allow_write(
    'blocks',
    on_action=[
        OperationType.DELETE,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)
