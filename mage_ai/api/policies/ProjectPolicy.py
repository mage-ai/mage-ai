from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.ProjectPresenter import ProjectPresenter


class ProjectPolicy(BasePolicy):
    pass


ProjectPolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

ProjectPolicy.allow_actions([
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

ProjectPolicy.allow_read(ProjectPresenter.default_attributes + [
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

ProjectPolicy.allow_write([
    'help_improve_mage',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

ProjectPolicy.allow_write([
    'emr_config',
    'features',
    'openai_api_key',
    'pipelines',
    'remote_variables_dir',
    'spark_config',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role())
