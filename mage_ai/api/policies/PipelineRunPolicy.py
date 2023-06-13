from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.PipelineRunPresenter import PipelineRunPresenter
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.db.models.oauth import Permission


class PipelineRunPolicy(BasePolicy):
    @property
    def entity(self):
        query = self.options.get('query', {})
        pipeline_uuid = query.get('pipeline_uuid', [None])
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]
        if pipeline_uuid:
            return Permission.Entity.PIPELINE, pipeline_uuid

        if self.resource and self.resource.model:
            return Permission.Entity.PIPELINE, self.resource.model.pipeline_uuid

        return Permission.Entity.PROJECT, get_project_uuid()


PipelineRunPolicy.allow_actions([
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelineRunPolicy.allow_actions([
    constants.CREATE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelineRunPolicy.allow_read(PipelineRunPresenter.default_attributes + [
    'block_runs',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelineRunPolicy.allow_read(PipelineRunPresenter.default_attributes + [
    'block_runs',
    'block_runs_count',
    'pipeline_schedule_name',
    'pipeline_schedule_token',
    'pipeline_schedule_type',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelineRunPolicy.allow_read(PipelineRunPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelineRunPolicy.allow_write([
    'backfill_id',
    'event_variables',
    'execution_date',
    'pipeline_schedule_id',
    'pipeline_uuid',
    'variables',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelineRunPolicy.allow_write([
    'from_block_uuid',
    'pipeline_run_action',
    'status',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelineRunPolicy.allow_query([
    'backfill_id',
    'order_by[]',
    'pipeline_uuid',
    'status',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())
