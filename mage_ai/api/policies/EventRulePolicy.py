from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.EventRulePresenter import EventRulePresenter


class EventRulePolicy(BasePolicy):
    pass


EventRulePolicy.allow_actions([
    constants.READ,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
])

EventRulePolicy.allow_read(EventRulePresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.READ,
])
