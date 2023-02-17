from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.LogPresenter import LogPresenter


class LogPolicy(BasePolicy):
    pass


LogPolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

LogPolicy.allow_read(LogPresenter.default_attributes + [
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

LogPolicy.allow_query([
    'block_run_id',
    'block_run_id[]',
    'block_type',
    'block_type[]',
    'block_uuid',
    'block_uuid[]',
    'end_timestamp',
    'level[]',
    'pipeline_run_id',
    'pipeline_run_id[]',
    'pipeline_schedule_id',
    'pipeline_schedule_id[]',
    'start_timestamp',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())
