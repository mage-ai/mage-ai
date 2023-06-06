from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.WidgetPresenter import WidgetPresenter
from mage_ai.data_preparation.repo_manager import get_repo_identifier
from mage_ai.orchestration.db.models.oauth import Permission


class WidgetPolicy(BasePolicy):
    @property
    def entity(self):
        parent_model = self.options.get('parent_model')
        if parent_model:
            return Permission.Entity.PIPELINE, parent_model.uuid

        return Permission.Entity.PROJECT, get_repo_identifier()


WidgetPolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

WidgetPolicy.allow_actions([
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

WidgetPolicy.allow_read(WidgetPresenter.default_attributes + [], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

WidgetPolicy.allow_read(WidgetPresenter.default_attributes + [
    'retry_config',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())

WidgetPolicy.allow_write([
    'all_upstream_blocks_executed',
    'color',
    'config',
    'configuration',
    'content',
    'downstream_blocks',
    'executor_config',
    'executor_type',
    'has_callback',
    'language',
    'name',
    'priority',
    'retry_config',
    'status',
    'type',
    'upstream_blocks',
    'uuid',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access())
