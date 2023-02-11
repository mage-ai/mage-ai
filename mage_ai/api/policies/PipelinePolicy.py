from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.PipelinePresenter import PipelinePresenter


class PipelinePolicy(BasePolicy):
    pass


PipelinePolicy.allow_actions([
    constants.DELETE,
    constants.READ,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
])

PipelinePolicy.allow_read([] + PipelinePresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DELETE,
    constants.READ,
    constants.UPDATE,
])

PipelinePolicy.allow_read(PipelinePresenter.default_attributes + [
    'schedules',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
])

PipelinePolicy.allow_write([
    'clone_pipeline_uuid',
    'name',
    'type',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
])

PipelinePolicy.allow_write([
    'status',
] + PipelinePresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
])

PipelinePolicy.allow_query([
    'includes_content',
    'includes_outputs',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.READ,
])

PipelinePolicy.allow_query([
    'include_schedules',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
])

PipelinePolicy.allow_query([
    'update_content',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
])
