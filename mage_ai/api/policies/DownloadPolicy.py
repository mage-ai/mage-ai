from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.DownloadPresenter import DownloadPresenter


class DownloadPolicy(BasePolicy):
    pass


DownloadPolicy.allow_actions([
    constants.CREATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

DownloadPolicy.allow_read(DownloadPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

DownloadPolicy.allow_write([
    'ignore_folder_structure',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_viewer_role())
