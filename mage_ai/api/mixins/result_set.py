from typing import List

from mage_ai.api.constants import AttributeOperationType
from mage_ai.api.operations.constants import OperationType
from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import (
    Permission,
    Role,
    RolePermission,
    UserRole,
)

CONTEXT_DATA_KEY_USER_PERMISSIONS = '__user_permissions'
CONTEXT_DATA_KEY_USER_PERMISSIONS_GRANTED = '__user_permissions_granted'
CONTEXT_DATA_KEY_USER_PERMISSIONS_GRANTED_KEY_OPERATIONS = '__operations'
CONTEXT_DATA_KEY_USER_PERMISSIONS_GRANTED_KEY_ATTRIBUTE_OPERATIONS = '__attribute_operations'


class ResultSetMixIn:
    @classmethod
    def entity_name_uuid(self) -> EntityName:
        model_name = self.model_name()
        if model_name in EntityName._value2member_map_:
            return EntityName(model_name)

        return None

    @safe_db_query
    async def load_and_cache_user_permissions(self) -> List[Permission]:
        # This will fetch the user permissions and store it on the context data
        # so that repeat policy user permission validations won’t keep querying the
        # database for permissions.
        if not self.current_user:
            return

        permissions = self.result_set().context.data.get(CONTEXT_DATA_KEY_USER_PERMISSIONS)
        if permissions:
            return permissions

        query = (
            Permission.
            select(
                Permission.access,
                Permission.entity,
                Permission.entity_id,
                Permission.entity_name,
                Permission.entity_type,
                Permission.id,
                Permission.options,
            ).
            join(
                RolePermission,
                RolePermission.permission_id == Permission.id).
            join(
                Role,
                Role.id == RolePermission.role_id).
            join(
                UserRole,
                UserRole.role_id == Role.id).
            filter(UserRole.user_id == self.current_user.id)
        )

        permissions = []

        for row in query.all():
            permission = Permission()
            permission.access = row.access
            permission.entity = row.entity
            permission.entity_id = row.entity_id
            permission.entity_name = row.entity_name
            permission.entity_type = row.entity_type
            permission.id = row.id
            permission.options = row.options
            permissions.append(permission)

        self.result_set().context.data[CONTEXT_DATA_KEY_USER_PERMISSIONS] = permissions

        return permissions

    async def load_cached_permission_authorization(
        self,
        operation: OperationType,
        attribute_operation_type: AttributeOperationType = None,
        resource_attribute: str = None,
    ) -> bool:
        authorized = None

        permissions_granted = self.result_set().context.data.get(
            CONTEXT_DATA_KEY_USER_PERMISSIONS_GRANTED,
        ) or {}

        if not permissions_granted:
            return authorized

        key = CONTEXT_DATA_KEY_USER_PERMISSIONS_GRANTED_KEY_OPERATIONS
        if attribute_operation_type and resource_attribute:
            key = CONTEXT_DATA_KEY_USER_PERMISSIONS_GRANTED_KEY_ATTRIBUTE_OPERATIONS

        if key not in permissions_granted:
            return authorized

        entity_name = self.entity_name_uuid()
        if entity_name not in permissions_granted[key]:
            return authorized

        if operation not in permissions_granted[key][entity_name]:
            return authorized

        if attribute_operation_type and resource_attribute:
            if attribute_operation_type not in permissions_granted[key][entity_name][operation]:
                return authorized

            if resource_attribute not in \
                    permissions_granted[key][entity_name][operation][attribute_operation_type]:

                return authorized

            authorized = permissions_granted[key][entity_name][operation][attribute_operation_type][
                resource_attribute
            ] or False
        else:
            authorized = permissions_granted[key][entity_name][operation] or False

        return authorized

    async def cache_permission_authorization(
        self,
        authorized: bool,
        operation: OperationType,
        attribute_operation_type: AttributeOperationType = None,
        resource_attribute: str = None,
    ) -> None:
        permissions_granted = self.result_set().context.data.get(
            CONTEXT_DATA_KEY_USER_PERMISSIONS_GRANTED,
        ) or {}

        key = CONTEXT_DATA_KEY_USER_PERMISSIONS_GRANTED_KEY_OPERATIONS
        if attribute_operation_type and resource_attribute:
            key = CONTEXT_DATA_KEY_USER_PERMISSIONS_GRANTED_KEY_ATTRIBUTE_OPERATIONS

        if key not in permissions_granted:
            permissions_granted[key] = {}

        entity_name = self.entity_name_uuid()
        if entity_name not in permissions_granted[key]:
            permissions_granted[key][entity_name] = {}

        if operation not in permissions_granted[key][entity_name]:
            permissions_granted[key][entity_name][operation] = {}

        if attribute_operation_type and resource_attribute:
            if attribute_operation_type not in permissions_granted[key][entity_name][operation]:
                permissions_granted[key][entity_name][operation][attribute_operation_type] = {}

            if resource_attribute not in \
                    permissions_granted[key][entity_name][operation][attribute_operation_type]:

                permissions_granted[key][entity_name][operation][attribute_operation_type][
                    resource_attribute
                ] = None

            permissions_granted[key][entity_name][operation][attribute_operation_type][
                resource_attribute
            ] = authorized
        else:
            permissions_granted[key][entity_name][operation] = authorized

        self.result_set().context.data[CONTEXT_DATA_KEY_USER_PERMISSIONS_GRANTED] = \
            permissions_granted
