from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.OutputPresenter import OutputPresenter
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db.models.schedules import BlockRun
from mage_ai.settings.platform.utils import get_pipeline_from_platform


class OutputPolicy(BasePolicy):
    def initialize_project_uuid(self):
        parent_model = self.options.get('parent_model')
        if parent_model:
            if type(parent_model) is BlockRun:
                pipeline = get_pipeline_from_platform(
                    parent_model.pipeline_run.project_uuid,
                    check_if_exists=True,
                    repo_path=parent_model.pipeline_run.pipeline_schedule.repo_path,
                    use_repo_path=True,
                )
                if pipeline:
                    self.project_uuid = pipeline.project_uuid

    @property
    def entity(self):
        parent_model = self.options.get('parent_model')
        if parent_model:
            if type(parent_model) is BlockRun:
                return Entity.PIPELINE, parent_model.pipeline_run.pipeline_uuid

        return super().entity


OutputPolicy.allow_actions([
    constants.CREATE,
    constants.DETAIL,
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

OutputPolicy.allow_read(OutputPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DETAIL,
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

OutputPolicy.allow_write([
    'block_uuid',
    'partition',
    'persist',
    'pipeline_uuid',
    'refresh',
    'sample_count',
    'streams',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

OutputPolicy.allow_query([
    'block_uuid',
    'parent_stream',
    'partition',
    'sample_count',
    'stream',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.DETAIL,
], condition=lambda policy: policy.has_at_least_viewer_role())
