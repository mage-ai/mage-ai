from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.OutputPresenter import OutputPresenter
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.orchestration.db.models.oauth import Permission
from mage_ai.orchestration.db.models.schedules import BlockRun


class OutputPolicy(BasePolicy):
    @property
    def entity(self):
        parent_model = self.options.get('parent_model')
        if parent_model:
            if type(parent_model) is BlockRun:
                return Permission.Entity.PIPELINE, parent_model.pipeline_run.pipeline_uuid

        return Permission.Entity.PROJECT, get_repo_path()


OutputPolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

OutputPolicy.allow_read(OutputPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())
