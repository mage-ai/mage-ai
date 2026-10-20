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
        constants.DETAIL,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)


BrowserItemPolicy.allow_actions(
    [
        constants.CREATE,
        constants.DELETE,
        constants.UPDATE,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_notebook_edit_access(),
)


BrowserItemPolicy.allow_read(
    BrowserItemPresenter.default_attributes,
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.CREATE,
        constants.DELETE,
        constants.UPDATE,
        constants.LIST,
        constants.DETAIL,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

BrowserItemPolicy.allow_write(
    [
        'content',
        'name',
        'path',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.CREATE,
        constants.DELETE,
        constants.UPDATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_notebook_edit_access(),
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

BrowserItemPolicy.allow_query(
    [
        'paths',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.LIST,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_notebook_edit_access(),
)
