from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.VariablePresenter import VariablePresenter
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.constants import Entity


class VariablePolicy(BasePolicy):
    @property
    def entity(self):
        parent_model = self.options.get('parent_model')
        if parent_model:
            return Entity.PIPELINE, parent_model.uuid

        return Entity.PROJECT, get_project_uuid()


VariablePolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_viewer_role())

VariablePolicy.allow_actions([
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_notebook_edit_access())

VariablePolicy.allow_read(VariablePresenter.default_attributes + [
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())

VariablePolicy.allow_read(VariablePresenter.default_attributes + [
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.DELETE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_notebook_edit_access())

VariablePolicy.allow_write([
    'name',
    'value',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.CREATE,
    constants.UPDATE,
], condition=lambda policy: policy.has_at_least_editor_role_and_notebook_edit_access())

VariablePolicy.allow_query([
    'global_only',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
], on_action=[
    constants.LIST,
], condition=lambda policy: policy.has_at_least_viewer_role())
