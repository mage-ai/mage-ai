from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.ServerSentEventPresenter import ServerSentEventPresenter
from mage_ai.orchestration.constants import Entity


class ServerSentEventPolicy(BasePolicy):
    @property
    def entity(self):
        # Adjust the entity to reflect the KernelProcess's entity, if applicable
        return Entity.ANY, None


ServerSentEventPolicy.allow_actions(
    [
        constants.CREATE,
        constants.LIST,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)


ServerSentEventPolicy.allow_read(
    ServerSentEventPresenter.default_attributes,
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.CREATE,
        constants.LIST,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)

ServerSentEventPolicy.allow_write(
    [
        'code',
        'message',
        'timestamp',
        'uuid',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)

ServerSentEventPolicy.allow_query(
    [
        'uuid',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.LIST,
    ],
    condition=lambda policy: policy.has_at_least_editor_role_and_pipeline_edit_access(),
)
