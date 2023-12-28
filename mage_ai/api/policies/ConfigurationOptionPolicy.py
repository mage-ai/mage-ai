from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.ConfigurationOptionPresenter import (
    ConfigurationOptionPresenter,
)


class ConfigurationOptionPolicy(BasePolicy):
    pass


ConfigurationOptionPolicy.allow_actions(
    [constants.LIST],
    scopes=[OauthScope.CLIENT_PRIVATE],
    condition=lambda policy: policy.has_at_least_viewer_role(),
    override_permission_condition=lambda _policy: True,
)


ConfigurationOptionPolicy.allow_read(
    ConfigurationOptionPresenter.default_attributes + [],
    scopes=[OauthScope.CLIENT_PRIVATE],
    on_action=[constants.LIST],
    condition=lambda policy: policy.has_at_least_viewer_role(),
    override_permission_condition=lambda _policy: True,
)


ConfigurationOptionPolicy.allow_query(
    [
        'configuration_type',
        'option_type',
        'resource_type',
        'resource_uuid',
    ],
    scopes=[OauthScope.CLIENT_PRIVATE],
    on_action=[constants.LIST],
    condition=lambda policy: policy.has_at_least_viewer_role(),
    override_permission_condition=lambda _policy: True,
)
