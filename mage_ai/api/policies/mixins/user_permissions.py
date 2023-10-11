import asyncio
from typing import Any, Callable, Dict, Tuple

from mage_ai.api.constants import (
    ATTRIBUTE_OPERATION_TYPE_DISABLE_TO_ACCESS_MAPPING,
    ATTRIBUTE_OPERATION_TYPE_TO_ACCESS_MAPPING,
    OPERATION_TYPE_DISABLE_TO_ACCESS_MAPPING,
    OPERATION_TYPE_TO_ACCESS_MAPPING,
    AttributeOperationType,
)
from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.authentication.permissions.constants import (
    PERMISSION_ACCESS_WITH_MULTIPLE_ACCESS,
    RESERVED_ENTITY_NAMES,
    EntityName,
    PermissionAccess,
)
from mage_ai.orchestration.db.models.oauth import Permission


def get_entity_name_from_policy(policy) -> EntityName:
    model_name = policy.model_name()
    if model_name in EntityName._value2member_map_:
        return EntityName(model_name)

    return None


async def validate_condition_with_permissions(
    policy,
    operation: OperationType,
    attribute_operation_type: AttributeOperationType = None,
    resource_attribute: str = None,
) -> bool:
    entity_name = get_entity_name_from_policy(policy)
    access = OPERATION_TYPE_TO_ACCESS_MAPPING.get(operation) or Permission.Access.OWNER
    disable_access = OPERATION_TYPE_DISABLE_TO_ACCESS_MAPPING.get(operation)

    access_for_attribute_operation = None
    disable_access_for_attribute_operation = None
    if attribute_operation_type:
        access_for_attribute_operation = ATTRIBUTE_OPERATION_TYPE_TO_ACCESS_MAPPING.get(
            attribute_operation_type,
        )
        disable_access_for_attribute_operation = \
            ATTRIBUTE_OPERATION_TYPE_DISABLE_TO_ACCESS_MAPPING.get(
                attribute_operation_type,
            )

    permissions = await (policy.resource or policy).load_and_cache_user_permissions()

    async def __permission_grants_access(
        permission: Permission,
        entity_name=entity_name,
        access=access,
        disable_access=disable_access,
        access_for_attribute_operation=access_for_attribute_operation,
        disable_access_for_attribute_operation=disable_access_for_attribute_operation,
        attribute_operation_type=attribute_operation_type,
        resource_attribute=resource_attribute,
    ) -> Tuple[bool, bool]:
        if permission.access is None:
            return (False, False)

        # Check if user is an owner
        if permission.access & PermissionAccess.OWNER:
            return (True, False)

        # 1. Get permissions for current entity_name for roles belonging to current user.
        # Include permissions where entity_name is ALL or ALL_EXCEPT_RESERVED.
        correct_entity_name = permission.entity_name == entity_name or \
            permission.entity_name == EntityName.ALL or \
            (
                permission.entity_name == EntityName.ALL_EXCEPT_RESERVED and
                entity_name not in RESERVED_ENTITY_NAMES
            )

        if not correct_entity_name:
            return (False, False)

        # 2a. Don’t grant access if permission disables access to this entity for this operation.
        if disable_access is not None and permission.access & disable_access:
            return (False, True)

        # 3. Add additional permission access (e.g. read, list, detail for viewer)
        # to grant access to this entity and its attributes
        permission_accesses = PERMISSION_ACCESS_WITH_MULTIPLE_ACCESS.get(f'{permission.access}')
        if not permission_accesses:
            permission_accesses = [permission.access]

        permission_granted = False
        permission_disabled = False

        for permission_access in permission_accesses:
            if permission_granted:
                break

            # Access to all operations and attribute operations
            if permission_access & PermissionAccess.ALL.value:
                permission_granted = True
                break

            # Disable all operations
            if permission_access & PermissionAccess.DISABLE_OPERATION_ALL.value:
                permission_disabled = True
                break

            has_access_for_all_operations = permission_access & PermissionAccess.OPERATION_ALL
            valid_for_operation = has_access_for_all_operations or permission_access & access

            # If this condition is validating attribute operations for an attribute:
            if access_for_attribute_operation:
                access_for_all = 0
                disable_access_for_all = 0

                if AttributeOperationType.QUERY == attribute_operation_type:
                    access_for_all = PermissionAccess.QUERY_ALL
                    disable_access_for_all = PermissionAccess.DISABLE_QUERY_ALL
                elif AttributeOperationType.READ == attribute_operation_type:
                    access_for_all = PermissionAccess.READ_ALL
                    disable_access_for_all = PermissionAccess.DISABLE_READ_ALL
                elif AttributeOperationType.WRITE == attribute_operation_type:
                    access_for_all = PermissionAccess.WRITE_ALL
                    disable_access_for_all = PermissionAccess.DISABLE_WRITE_ALL

                if permission_access & disable_access_for_all:
                    permission_disabled = True
                    break

                has_access_for_all_attributes = permission_access & access_for_all
                valid_for_operation = valid_for_operation and \
                    (
                        permission_access & access_for_attribute_operation or
                        has_access_for_all_attributes
                    )

                # Don’t grant access if permission disables access to this entity’s attributes
                # for this attribute operation.
                if disable_access_for_attribute_operation is not None and \
                        permission.access & disable_access_for_attribute_operation:

                    disabled_attributes = []
                    if AttributeOperationType.QUERY == attribute_operation_type:
                        disabled_attributes = permission.query_attributes
                    elif AttributeOperationType.READ == attribute_operation_type:
                        disabled_attributes = permission.read_attributes
                    elif AttributeOperationType.WRITE == attribute_operation_type:
                        disabled_attributes = permission.write_attributes

                    if resource_attribute in (disabled_attributes or []):
                        permission_disabled = True
                        break

                if not has_access_for_all_attributes:
                    if valid_for_operation and attribute_operation_type and resource_attribute:
                        permitted_attributes = []
                        if AttributeOperationType.QUERY == attribute_operation_type:
                            permitted_attributes = permission.query_attributes
                        elif AttributeOperationType.READ == attribute_operation_type:
                            permitted_attributes = permission.read_attributes
                        elif AttributeOperationType.WRITE == attribute_operation_type:
                            permitted_attributes = permission.write_attributes

                        valid_for_operation = resource_attribute in (permitted_attributes or [])

            if valid_for_operation:
                permission_granted = True
                break

        return (permission_granted, permission_disabled)

    validation_results = await asyncio.gather(
        *[__permission_grants_access(p) for p in permissions]
    )

    authorized = False
    unauthorized = False
    for permission_granted, permission_disabled in validation_results:
        if permission_disabled:
            unauthorized = True
            break

        if permission_granted and not authorized:
            authorized = True

    return authorized and not unauthorized


class UserPermissionMixIn:
    @classmethod
    def action_rule_with_permissions(self, operation: OperationType) -> Dict:
        return {
            OauthScope.CLIENT_PRIVATE: dict(
                condition=self.build_validate_condition(operation),
            ),
        }

    @classmethod
    def attribute_rule_with_permissions(
        self,
        attribute_operation_type: AttributeOperationType,
        resource_attribute: str,
    ) -> Dict:
        conditions = {}
        for operation in OperationType:
            conditions[operation.value] = dict(
                condition=self.build_validate_attribute(
                    operation,
                    attribute_operation_type,
                    resource_attribute,
                ),
            )

        return {
            OauthScope.CLIENT_PRIVATE: conditions,
        }

    @classmethod
    def build_validate_attribute(
        self,
        operation: OperationType,
        attribute_operation_type: AttributeOperationType,
        resource_attribute: str,
    ) -> Callable[[Any], bool]:
        def _validate_condition(policy) -> bool:
            return validate_condition_with_permissions(
                policy,
                operation,
                attribute_operation_type=attribute_operation_type,
                resource_attribute=resource_attribute,
            )

        return _validate_condition

    @classmethod
    def build_validate_condition(self, operation: OperationType) -> Callable[[Any], bool]:
        def _validate_condition(policy) -> bool:
            return validate_condition_with_permissions(policy, operation)

        return _validate_condition
