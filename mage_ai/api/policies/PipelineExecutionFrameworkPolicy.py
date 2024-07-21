from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.PipelineExecutionFrameworkPresenter import (
    PipelineExecutionFrameworkPresenter,
)
from mage_ai.orchestration.constants import Entity


class PipelineExecutionFrameworkPolicy(BasePolicy):
    @property
    def entity(self):
        # Adjust the entity to reflect the KernelProcess's entity, if applicable
        return Entity.ANY, None


PipelineExecutionFrameworkPolicy.allow_actions(
    [
        OperationType.DETAIL,
        OperationType.LIST,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

PipelineExecutionFrameworkPolicy.allow_actions(
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


PipelineExecutionFrameworkPolicy.allow_read(
    PipelineExecutionFrameworkPresenter.default_attributes + ['pipelines'],
    on_action=[
        OperationType.LIST,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

PipelineExecutionFrameworkPolicy.allow_read(
    PipelineExecutionFrameworkPresenter.default_attributes + ['framework', 'pipelines'],
    on_action=[
        OperationType.DETAIL,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

PipelineExecutionFrameworkPolicy.allow_read(
    PipelineExecutionFrameworkPresenter.default_attributes + ['pipelines'],
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

PipelineExecutionFrameworkPolicy.allow_write(
    [
        'clone_pipeline_uuid',
        'custom_template_uuid',
        'description',
        'name',
        'tags',
        'type',
        'uuid',
    ],
    on_action=[
        OperationType.CREATE,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)

PipelineExecutionFrameworkPolicy.allow_write(
    [
        'block',
        'blocks',
        'description',
        'execution_framework',
        'name',
        'pipelines',
        'settings',
        'tags',
        'type',
        'uuid',
        'variables',
    ],
    on_action=[
        OperationType.UPDATE,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)
