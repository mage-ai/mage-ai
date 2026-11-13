from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.BlockRunPresenter import BlockRunPresenter
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.orchestration.constants import Entity


class BlockRunPolicy(BasePolicy):
    def initialize_project_uuid(self):
        query = self.options.get('query', {})
        pipeline_uuid = query.get('pipeline_uuid', [None])
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]
        parent_model = self.options.get('parent_model')
        if self.resource:
            block_run = self.resource.model
            repo_config = get_repo_config(
                repo_path=block_run.pipeline_run.pipeline_schedule.repo_path
            )
            if repo_config:
                self.project_uuid = repo_config.project_uuid
        elif parent_model:
            repo_config = get_repo_config(repo_path=parent_model.pipeline_schedule.repo_path)
            if repo_config:
                self.project_uuid = repo_config.project_uuid
        else:
            super().initialize_project_uuid()

    @property
    def entity(self):
        query = self.options.get('query', {})
        pipeline_uuid = query.get('pipeline_uuid', [None])
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]
        if pipeline_uuid:
            return Entity.PIPELINE, pipeline_uuid

        parent_model = self.options.get('parent_model')
        if parent_model:
            return Entity.PIPELINE, parent_model.pipeline_uuid

        return super().entity


BlockRunPolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

BlockRunPolicy.allow_read(BlockRunPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

BlockRunPolicy.allow_query([
    'order_by',
    'pipeline_run_id',
    'pipeline_uuid',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())
