from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.AutocompleteItemPresenter import AutocompleteItemPresenter
from mage_ai.orchestration.db.models.oauth import Permission


class AutocompleteItemPolicy(BasePolicy):
    @property
    def entity(self):
        return Permission.Entity.ANY, None


AutocompleteItemPolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

AutocompleteItemPolicy.allow_read(AutocompleteItemPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())
