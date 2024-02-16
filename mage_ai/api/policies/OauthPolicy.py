from typing import Dict

from mage_ai.api.constants import AttributeOperationType, AttributeType
from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.policies.mixins.user_permissions import UserPermissionMixIn
from mage_ai.api.presenters.OauthPresenter import OauthPresenter
from mage_ai.shared.hash import merge_dict


class OauthPolicy(BasePolicy, UserPermissionMixIn):
    @classmethod
    def action_rule_with_permissions(self, operation: OperationType) -> Dict:
        return merge_dict(
            super().action_rule_with_permissions(operation),
            {
                OauthScope.CLIENT_PUBLIC: [
                    dict(
                        condition=lambda _policy: operation
                        in [OperationType.DETAIL, OperationType.LIST],
                    ),
                ],
            },
        )

    @classmethod
    def attribute_rule_with_permissions(
        self,
        attribute_operation_type: AttributeOperationType,
        resource_attribute: str,
    ) -> Dict:
        config = {}
        if AttributeOperationType.READ == attribute_operation_type:
            config = self.read_rules[self.__name__].get(resource_attribute)
        elif AttributeOperationType.QUERY == attribute_operation_type:
            config = self.query_rules[self.__name__].get(AttributeType.ALL)
        else:
            config = self.write_rules[self.__name__].get(resource_attribute)

        return merge_dict(
            super().attribute_rule_with_permissions(
                attribute_operation_type,
                resource_attribute,
            ),
            {
                OauthScope.CLIENT_PUBLIC: {
                    OperationType.DETAIL: (config.get(
                        OauthScope.CLIENT_PUBLIC,
                    ) or {}).get(OperationType.DETAIL) or {},
                    OperationType.LIST: (config.get(
                        OauthScope.CLIENT_PUBLIC,
                    ) or {}).get(OperationType.LIST) or {},
                },
            },
        )


OauthPolicy.allow_actions(
    [
        constants.CREATE,
        constants.UPDATE,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)


OauthPolicy.allow_actions(
    [
        constants.DETAIL,
        constants.LIST,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
        OauthScope.CLIENT_PUBLIC,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)


OauthPolicy.allow_read(
    OauthPresenter.default_attributes,
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.CREATE,
        constants.UPDATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)


OauthPolicy.allow_read(
    OauthPresenter.default_attributes,
    scopes=[
        OauthScope.CLIENT_PRIVATE,
        OauthScope.CLIENT_PUBLIC,
    ],
    on_action=[
        constants.LIST,
        constants.DETAIL,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)


OauthPolicy.allow_write(
    [
        'provider',
        'token',
        'refresh_token',
        'expires_in',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.CREATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)


OauthPolicy.allow_write(
    [
        'action_type',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.UPDATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)


OauthPolicy.allow_query(
    on_action=[
        constants.LIST,
        constants.DETAIL,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
        OauthScope.CLIENT_PUBLIC,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)
