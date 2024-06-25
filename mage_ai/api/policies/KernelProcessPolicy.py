from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.KernelProcessPresenter import KernelProcessPresenter
from mage_ai.kernels.constants import KernelOperation
from mage_ai.orchestration.constants import Entity


class KernelProcessPolicy(BasePolicy):
    @property
    def entity(self):
        # Adjust the entity to reflect the KernelProcess's entity, if applicable
        return Entity.ANY, None


KernelProcessPolicy.allow_actions(
    [OperationType.LIST],
    condition=lambda policy: policy.has_at_least_viewer_role(),
    scopes=[OauthScope.CLIENT_PRIVATE],
)


KernelProcessPolicy.allow_actions(
    [OperationType.DELETE, OperationType.UPDATE],
    condition=lambda policy: policy.has_at_least_editor_role_and_notebook_edit_access(),
    scopes=[OauthScope.CLIENT_PRIVATE],
)


KernelProcessPolicy.allow_read(
    KernelProcessPresenter.default_attributes,
    condition=lambda policy: policy.has_at_least_viewer_role(),
    on_action=[OperationType.LIST, OperationType.DELETE, OperationType.UPDATE],
    scopes=[OauthScope.CLIENT_PRIVATE],
)


KernelProcessPolicy.allow_write(
    [KernelOperation.INTERRUPT, KernelOperation.RESTART],
    condition=lambda policy: policy.has_at_least_editor_role_and_notebook_edit_access(),
    on_action=[OperationType.UPDATE],
    scopes=[OauthScope.CLIENT_PRIVATE],
)
