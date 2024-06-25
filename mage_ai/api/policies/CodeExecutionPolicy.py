from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.CodeExecutionPresenter import CodeExecutionPresenter
from mage_ai.orchestration.constants import Entity


class CodeExecutionPolicy(BasePolicy):
    @property
    def entity(self):
        # Adjust the entity to reflect the KernelProcess's entity, if applicable
        return Entity.ANY, None


CodeExecutionPolicy.allow_actions(
    [
        OperationType.CREATE,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)


CodeExecutionPolicy.allow_read(
    CodeExecutionPresenter.default_attributes,
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.CREATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)

CodeExecutionPolicy.allow_write(
    [
        'environment',
        'message',
        'message_request_uuid',
        'output_path',
        'source',
        'stream',
        'timestamp',
        'uuid',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.CREATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)
