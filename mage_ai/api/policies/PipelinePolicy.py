from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.PipelinePresenter import PipelinePresenter
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.db.models.oauth import Permission


class PipelinePolicy(BasePolicy):
    @property
    def entity(self):
        if self.resource and self.resource.model:
            return Permission.Entity.PIPELINE, self.resource.model.uuid

        return Permission.Entity.PROJECT, get_project_uuid()


PipelinePolicy.allow_actions([
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelinePolicy.allow_actions([
    constants.CREATE,
    constants.DELETE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

PipelinePolicy.allow_actions([
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelinePolicy.allow_read(PipelinePresenter.default_attributes + [
    'callbacks',
    'conditionals',
    'extensions',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelinePolicy.allow_read(PipelinePresenter.default_attributes + [
    'callbacks',
    'conditionals',
    'extensions',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DELETE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

PipelinePolicy.allow_read(PipelinePresenter.default_attributes + [
    'callbacks',
    'conditionals',
    'extensions',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelinePolicy.allow_read(PipelinePresenter.default_attributes + [
    'callbacks',
    'conditionals',
    'extensions',
    'schedules',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelinePolicy.allow_write([
    'callbacks',
    'conditionals',
    'clone_pipeline_uuid',
    'extensions',
    'name',
    'type',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

PipelinePolicy.allow_write([
    'add_upstream_for_block_uuid',
    'callbacks',
    'conditionals',
    'extensions',
    'schedules',
] + PipelinePresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

PipelinePolicy.allow_write([
    'pipeline_runs',
    'status',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelinePolicy.allow_query([
    'includes_block_metadata',
    'includes_content',
    'includes_extensions',
    'includes_outputs',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelinePolicy.allow_query([
    'status[]',
    'type[]',
    'include_schedules',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelinePolicy.allow_query([
    'update_content',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())
