from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.PipelineSchedulePresenter import PipelineSchedulePresenter
from mage_ai.data_preparation.models.pipelines.interactions import PipelineInteractions
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.constants import Entity

READABLE_ATTRIBUTES_FOR_PIPELINE_INTERACTIONS = [
    'description',
    'name',
    'schedule_interval',
    'schedule_type',
    'start_time',
    'status',
    'variables',
]
WRITABLE_ATTRIBUTES_FOR_PIPELINE_INTERACTIONS = [
    'description',
    'name',
    'schedule_interval',
    'schedule_type',
    'start_time',
    'status',
    'variables',
]


class PipelineSchedulePolicy(BasePolicy):
    @property
    def entity(self):
        if self.resource and self.resource.model:
            return Entity.PIPELINE, self.resource.model.pipeline_uuid

        return Entity.PROJECT, get_project_uuid()


async def authorize_operation_create(policy: PipelineSchedulePolicy) -> bool:
    if policy.has_at_least_editor_role():
        return True

    pipeline = policy.parent_model()
    if Project(pipeline.repo_config).is_feature_enabled(FeatureUUID.INTERACTIONS):
        pipeline_interactions = PipelineInteractions(pipeline)
        validation = await pipeline_interactions.filter_for_permissions(policy.current_user)
        return validation

    return False


PipelineSchedulePolicy.allow_actions([
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelineSchedulePolicy.allow_actions([
    constants.DELETE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelineSchedulePolicy.allow_actions([
    constants.CREATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=authorize_operation_create)

PipelineSchedulePolicy.allow_read(PipelineSchedulePresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DELETE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelineSchedulePolicy.allow_read(PipelineSchedulePresenter.default_attributes + [
    'event_matchers',
    'next_pipeline_run_date',
    'tags',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelineSchedulePolicy.allow_read(PipelineSchedulePresenter.default_attributes + [
    'event_matchers',
    'next_pipeline_run_date',
    'runtime_average',
    'tags',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelineSchedulePolicy.allow_read(PipelineSchedulePresenter.default_attributes + [
    'event_matchers',
    'last_pipeline_run_status',
    'next_pipeline_run_date',
    'pipeline_runs_count',
    'tags',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelineSchedulePolicy.allow_write([
    'repo_path',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelineSchedulePolicy.allow_write([
    'description',
    'event_matchers',
    'id',
    'name',
    'repo_path',
    'schedule_interval',
    'schedule_type',
    'settings',
    'sla',
    'start_time',
    'status',
    'tags',
    'variables',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelineSchedulePolicy.allow_query([
    'global_data_product_uuid',
    'order_by',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelineSchedulePolicy.allow_query([
    'schedule_interval[]',
    'schedule_type[]',
    'status[]',
    'tag[]',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

# Policies for creating triggers using pipeline interactions

PipelineSchedulePolicy.allow_read(READABLE_ATTRIBUTES_FOR_PIPELINE_INTERACTIONS, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=authorize_operation_create)


PipelineSchedulePolicy.allow_write(WRITABLE_ATTRIBUTES_FOR_PIPELINE_INTERACTIONS, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=authorize_operation_create)
