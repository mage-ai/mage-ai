from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.BlockPresenter import BlockPresenter
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db.models.schedules import PipelineRun


class BlockPolicy(BasePolicy):
    @property
    def entity(self):
        parent_model = self.options.get('parent_model')
        if parent_model:
            pipeline_uuid = None
            if isinstance(parent_model, PipelineRun):
                pipeline_uuid = parent_model.pipeline_uuid
            else:
                pipeline_uuid = parent_model.uuid

            return Entity.PIPELINE, pipeline_uuid

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
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

BlockPolicy.allow_read([
    'catalog',
    'configuration',
    'content',
    'documenation',
    'metadata',
] + BlockPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

BlockPolicy.allow_read(BlockPresenter.default_attributes + [
    'configuration',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DELETE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

BlockPolicy.allow_read([
    'bookmarks',
    'catalog',
    'configuration',
    'content',
    'description',
    'documentation',
    'metadata',
    'outputs',
    'pipelines',
    'runtime',
    'tags',
] + BlockPresenter.default_attributes, scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

BlockPolicy.allow_write([
    'block_action_object',
    'catalog',
    'color',
    'config',
    'configuration',
    'content',
    'converted_from',
    'defaults',
    'downstream_blocks',
    'extension_uuid',
    'has_callback',
    'language',
    'metadata',
    'name',
    'pipelines',
    'priority',
    'replicated_block',
    'require_unique_name',
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
    'catalog',
    'color',
    'conditional_blocks',
    'configuration',
    'content',
    'documentation',
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
    'timeout',
    'type',
    'upstream_blocks',
    'uuid',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

BlockPolicy.allow_query([
    'block_uuid[]',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

BlockPolicy.allow_query([
    'block_type',
    'data_integration_type',
    'data_integration_uuid',
    'destination_table',
    'file_path',
    'include_block_catalog',
    'include_block_metadata',
    'include_documentation',
    'state_stream',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())

BlockPolicy.allow_query([
    'extension_uuid',
    'file_path',
    'force',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DELETE,
], condition=lambda policy: policy.has_at_least_viewer_role())

BlockPolicy.allow_query([
    'extension_uuid',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: (
    policy.has_at_least_viewer_role() or
    policy.has_at_least_editor_role_and_pipeline_edit_access()
))

BlockPolicy.allow_query([
    'block_language',
    'block_type',
    'include_block_catalog',
    'update_state',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())
