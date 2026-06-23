from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.constants import Entity


class LlmPolicy(BasePolicy):
    def initialize_project_uuid(self):
        parent_model = self.options.get('parent_model')
        if parent_model:
            if issubclass(parent_model.__class__, Pipeline):
                self.project_uuid = parent_model.project_uuid
        else:
            super().initialize_project_uuid()

    @property
    def entity(self):
        parent_model = self.options.get('parent_model')
        if parent_model:
            if issubclass(parent_model.__class__, Pipeline):
                return Entity.PIPELINE, parent_model.uuid

        return super().entity


LlmPolicy.allow_actions([
    constants.CREATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role())


LlmPolicy.allow_read([
    'response',
    'use_case',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role())


LlmPolicy.allow_write([
    'request',
    'use_case',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
], condition=lambda policy: policy.has_at_least_editor_role())
