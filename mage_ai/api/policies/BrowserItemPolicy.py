from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.BrowserItemPresenter import BrowserItemPresenter
from mage_ai.orchestration.constants import Entity


class BrowserItemPolicy(BasePolicy):
    @property
    def entity(self):
        # Adjust the entity to reflect the KernelProcess's entity, if applicable
        return Entity.ANY, None


BrowserItemPolicy.allow_actions(
    [
        constants.LIST,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)


BrowserItemPolicy.allow_read(
    BrowserItemPresenter.default_attributes,
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.LIST,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

BrowserItemPolicy.allow_query(
    [
        'directory',
        'include_pattern',
        'exclude_pattern',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.LIST,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)
