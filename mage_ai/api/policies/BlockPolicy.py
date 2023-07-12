from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.BlockPresenter import BlockPresenter
from mage_ai.orchestration.db.models.oauth import Permission


class BlockPolicy(BasePolicy):
    @property
    def entity(self):
        parent_model = self.options.get('parent_model')
        if parent_model:
            return Permission.Entity.PIPELINE, parent_model.uuid

        return super().entity


BlockPolicy.allow_actions([
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

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
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

BlockPolicy.allow_read(BlockPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DELETE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

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
    'pipelines',
    'priority',
    'replicated_block',
    'type',
    'upstream_blocks',
    'uuid',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

BlockPolicy.allow_write([
    'all_upstream_blocks_executed',
    'bookmark_values',
    'callback_blocks',
    'color',
    'conditional_blocks',
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
    'pipelines',
    'replicated_block',
    'retry_config',
    'status',
    'tags',
    'tap_stream_id',
    'type',
    'upstream_blocks',
    'uuid',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

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

BlockPolicy.allow_query([
    'block_language',
    'block_type',
    'extension_uuid',
    'update_state',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())
