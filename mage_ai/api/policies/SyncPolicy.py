from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.SyncPresenter import SyncPresenter


class SyncPolicy(BasePolicy):
    pass


SyncPolicy.allow_actions([
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

SyncPolicy.allow_actions([
    constants.CREATE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role())

SyncPolicy.allow_read(SyncPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DETAIL,
    constants.LIST,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

SyncPolicy.allow_write(SyncPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role())

SyncPolicy.allow_write([
    'action_type',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())
