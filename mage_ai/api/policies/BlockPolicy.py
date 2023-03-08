from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.BlockPresenter import BlockPresenter


class BlockPolicy(BasePolicy):
    pass


BlockPolicy.allow_actions([
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_edit_access())

BlockPolicy.allow_actions([
    constants.DETAIL,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

BlockPolicy.allow_read([
    'content',
] + BlockPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_edit_access())

BlockPolicy.allow_read(BlockPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DELETE,
], condition=lambda policy: policy.has_at_least_editor_role_and_edit_access())

BlockPolicy.allow_read([
    'bookmarks',
    'content',
    'outputs',
] + BlockPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())

BlockPolicy.allow_write([
    'color',
    'config',
    'configuration',
    'content',
    'converted_from',
    'extension_uuid',
    'has_callback',
    'language',
    'metadata',
    'name',
    'priority',
    'type',
    'upstream_blocks',
    'uuid',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_edit_access())

BlockPolicy.allow_write([
    'all_upstream_blocks_executed',
    'bookmark_values',
    'color',
    'configuration',
    'content',
    'destination_table',
    'downstream_blocks',
    'executor_config',
    'executor_type',
    'extension_uuid',
    'has_callback',
    'language',
    'metadata',
    'name',
    'outputs',
    'status',
    'tap_stream_id',
    'type',
    'upstream_blocks',
    'uuid',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_edit_access())

BlockPolicy.allow_query([
    'destination_table',
    'state_stream',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())

BlockPolicy.allow_query([
    'extension_uuid',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DELETE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())
