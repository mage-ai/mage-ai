from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.BackfillPresenter import BackfillPresenter


class BackfillPolicy(BasePolicy):
    pass


BackfillPolicy.allow_actions([
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

BackfillPolicy.allow_actions([
    constants.CREATE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role())

BackfillPolicy.allow_read([
    'pipeline_run_dates',
    'total_run_count',
] + BackfillPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

BackfillPolicy.allow_read([] + BackfillPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())

BackfillPolicy.allow_write([
    'name',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role())

BackfillPolicy.allow_write([
    'block_uuid',
    'end_datetime',
    'interval_type',
    'interval_units',
    'name',
    'start_datetime',
    'status',
    'variables',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())

BackfillPolicy.allow_query([
    'include_preview_runs',
    'include_run_count',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())

BackfillPolicy.allow_query([
    'pipeline_uuid',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())
