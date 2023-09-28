from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.IntegrationDestinationPresenter import IntegrationDestinationPresenter


class IntegrationDestinationPolicy(BasePolicy):
    pass


IntegrationDestinationPolicy.allow_actions([
    constants.CREATE,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

IntegrationDestinationPolicy.allow_read(IntegrationDestinationPresenter.default_attributes + [
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

IntegrationDestinationPolicy.allow_read([
    'error_message',
    'success',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

IntegrationDestinationPolicy.allow_write([
    'action_type',
    'config',
    'pipeline_uuid',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_viewer_role())
