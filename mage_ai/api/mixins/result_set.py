from typing import List

from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import (
    Permission,
    Role,
    RolePermission,
    UserRole,
)

CONTEXT_DATA_KEY_USER_PERMISSIONS = '__user_permissions'


class ResultSetMixIn:
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
