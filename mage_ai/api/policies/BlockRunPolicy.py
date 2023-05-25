from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.BlockRunPresenter import BlockRunPresenter
from mage_ai.orchestration.db.models.oauth import Permission


class BlockRunPolicy(BasePolicy):
    @property
    def entity(self):
        query = self.options.get('query', {})
        pipeline_uuid = query.get('pipeline_uuid', [None])
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]
        if pipeline_uuid:
            return Permission.Entity.PIPELINE, pipeline_uuid

        parent_model = self.options.get('parent_model')
        if parent_model:
            return Permission.Entity.PIPELINE, parent_model.pipeline_uuid

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
    'pipeline_run_id',
    'pipeline_uuid',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())
