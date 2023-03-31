from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.PipelineSchedulePresenter import PipelineSchedulePresenter


class PipelineSchedulePolicy(BasePolicy):
    pass


PipelineSchedulePolicy.allow_actions([
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelineSchedulePolicy.allow_actions([
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelineSchedulePolicy.allow_read(PipelineSchedulePresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DELETE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelineSchedulePolicy.allow_read(PipelineSchedulePresenter.default_attributes + [
    'event_matchers',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelineSchedulePolicy.allow_read(PipelineSchedulePresenter.default_attributes + [
    'event_matchers',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelineSchedulePolicy.allow_read(PipelineSchedulePresenter.default_attributes + [
    'event_matchers',
    'last_pipeline_run_status',
    'pipeline_runs_count',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

PipelineSchedulePolicy.allow_write([
    'name',
    'schedule_interval',
    'schedule_type',
    'start_time',
    'status',
    'variables',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelineSchedulePolicy.allow_write([
    'event_matchers',
    'id',
    'name',
    'schedule_interval',
    'schedule_type',
    'settings',
    'sla',
    'start_time',
    'status',
    'variables',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())

PipelineSchedulePolicy.allow_query([
    'order_by',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())
