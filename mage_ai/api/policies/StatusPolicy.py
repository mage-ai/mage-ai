from typing import Dict

from mage_ai.api.constants import AttributeOperationType
from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.policies.mixins.user_permissions import UserPermissionMixIn
from mage_ai.api.presenters.StatusPresenter import StatusPresenter
from mage_ai.shared.hash import merge_dict


class StatusPolicy(BasePolicy, UserPermissionMixIn):
    @classmethod
    def action_rule_with_permissions(self, operation: OperationType) -> Dict:
        return merge_dict(super().action_rule_with_permissions(operation), {
            OauthScope.CLIENT_PRIVATE: [
                dict(condition=lambda _policy: OperationType.LIST == operation),
            ],
            OauthScope.CLIENT_PUBLIC: [
                dict(condition=lambda _policy: OperationType.LIST == operation),
            ],
        })

    @classmethod
    def attribute_rule_with_permissions(
        self,
        attribute_operation_type: AttributeOperationType,
        resource_attribute: str,
    ) -> Dict:
        config = {}
        if AttributeOperationType.READ == attribute_operation_type:
            config = self.read_rules[self.__name__].get(resource_attribute)
        else:
            config = self.write_rules[self.__name__].get(resource_attribute)

        return merge_dict(super().attribute_rule_with_permissions(
            attribute_operation_type,
            resource_attribute,
        ), {
            OauthScope.CLIENT_PRIVATE: {
                OperationType.LIST: config[OauthScope.CLIENT_PRIVATE][OperationType.LIST],
            },
            OauthScope.CLIENT_PUBLIC: {
                OperationType.LIST: config[OauthScope.CLIENT_PUBLIC][OperationType.LIST],
            },
        })


StatusPolicy.allow_actions([
    constants.LIST,
], scopes=[
    OauthScope.CLIENT_PRIVATE,
    OauthScope.CLIENT_PUBLIC,
])

StatusPolicy.allow_read(StatusPresenter.default_attributes + [
    'active_pipeline_run_count',
    'last_scheduler_activity',
    'last_user_request',
], scopes=[
    OauthScope.CLIENT_PRIVATE,
    OauthScope.CLIENT_PUBLIC,
], on_action=[
    constants.LIST,
])
