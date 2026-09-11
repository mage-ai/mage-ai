from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.OutputPresenter import OutputPresenter
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db.models.schedules import BlockRun


class OutputPolicy(BasePolicy):
    def initialize_project_uuid(self):
        parent_model = self.options.get('parent_model')
        if parent_model:
            if type(parent_model) is BlockRun:
                repo_config = get_repo_config(
                    parent_model.pipeline_run.pipeline_schedule.repo_path
                )
                if repo_config:
                    self.project_uuid = repo_config.project_uuid
        else:
            super().initialize_project_uuid()

    @property
    def entity(self):
        parent_model = self.options.get('parent_model')
        if parent_model:
            if type(parent_model) is BlockRun:
                return Entity.PIPELINE, parent_model.pipeline_run.pipeline_uuid

        return super().entity


OutputPolicy.allow_actions(
    [
        constants.CREATE,
        constants.DETAIL,
        constants.LIST,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

OutputPolicy.allow_read(
    OutputPresenter.default_attributes + [],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.CREATE,
        constants.DETAIL,
        constants.LIST,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

OutputPolicy.allow_write(
    [
        'block_uuid',
        'partition',
        'persist',
        'pipeline_uuid',
        'refresh',
        'sample_count',
        'streams',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.CREATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

OutputPolicy.allow_query(
    [
        'block_uuid',
        'parent_stream',
        'partition',
        'sample_count',
        'stream',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.DETAIL,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

OutputPolicy.allow_query(
    [
        'sample_count',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.LIST,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)
