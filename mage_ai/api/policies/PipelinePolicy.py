from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.PipelinePresenter import PipelinePresenter


class PipelinePolicy(BasePolicy):
    pass


PipelinePolicy.allow_actions([
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelinePolicy.allow_actions([
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_edit_access())

PipelinePolicy.allow_read(PipelinePresenter.default_attributes + [
    'extensions',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelinePolicy.allow_read(PipelinePresenter.default_attributes + [
    'extensions',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_edit_access())

PipelinePolicy.allow_read(PipelinePresenter.default_attributes + [
    'extensions',
    'schedules',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelinePolicy.allow_write([
    'clone_pipeline_uuid',
    'extensions',
    'name',
    'type',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_edit_access())

PipelinePolicy.allow_write([
    'add_upstream_for_block_uuid',
    'extensions',
    'schedules',
    'status',
] + PipelinePresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_edit_access())

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
], condition=lambda policy: policy.has_at_least_editor_role_and_edit_access())
