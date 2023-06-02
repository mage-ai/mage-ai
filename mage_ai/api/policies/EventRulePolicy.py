from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.EventRulePresenter import EventRulePresenter
from mage_ai.orchestration.db.models.oauth import Permission


class EventRulePolicy(BasePolicy):
    @property
    def entity(self):
        return Permission.Entity.ANY, None


EventRulePolicy.allow_actions([
    constants.DETAIL,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

EventRulePolicy.allow_read(EventRulePresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())
