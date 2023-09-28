from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.DataProviderPresenter import DataProviderPresenter
from mage_ai.orchestration.constants import Entity


class DataProviderPolicy(BasePolicy):
    @property
    def entity(self):
        return Entity.ANY, None


DataProviderPolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

DataProviderPolicy.allow_read(DataProviderPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())
