from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.ExtensionOptionPresenter import ExtensionOptionPresenter
from mage_ai.orchestration.db.models.oauth import Permission


class ExtensionOptionPolicy(BasePolicy):
    @property
    def entity(self):
        return Permission.Entity.ANY, None


ExtensionOptionPolicy.allow_actions([
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())


ExtensionOptionPolicy.allow_read(ExtensionOptionPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())
