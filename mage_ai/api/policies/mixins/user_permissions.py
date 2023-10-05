from typing import Any, Callable, Dict

from mage_ai.api.constants import (
    OPERATION_TYPE_DISABLE_TO_ACCESS_MAPPING,
    OPERATION_TYPE_TO_ACCESS_MAPPING,
)
from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.utils import get_entity_name_from_resource
from mage_ai.authentication.permissions.constants import (
    PERMISSION_ACCESS_WITH_MULTIPLE_ACCESS,
    RESERVED_ENTITY_NAMES,
    EntityName,
)
from mage_ai.orchestration.db.models.oauth import Permission


def build_validate_condition(action: OperationType) -> Callable[[Any, OperationType], bool]:
    def _validate_condition(policy, action=action):
        return validate_condition_with_permissions(policy, action)

    return _validate_condition


async def validate_condition_with_permissions(policy, action: OperationType) -> bool:
    resource = policy.resource
    entity_name = get_entity_name_from_resource(resource)
    access = OPERATION_TYPE_TO_ACCESS_MAPPING.get(action) or Permission.Access.OWNER
    disable_access = OPERATION_TYPE_DISABLE_TO_ACCESS_MAPPING.get(action)

    permissions = await resource.load_and_cache_user_permissions()

    print(
        'WTFFFFFFFFFFFFFFFFFFFFFFFFFFFF2 validate_condition_with_permissions',
        entity_name,
        action,
        access,
        disable_access,
        permissions,
    )

    async def __should_select_permission_for_entity_name_with_access(
        permission: Permission,
        entity_name=entity_name,
        access=access,
        disable_access=disable_access,
    ) -> bool:
        # 1. Get permissions for current entity_name for roles belonging to current user.
        # Include permissions where entity_name is ALL or ALL_EXCEPT_RESERVED.
        correct_entity_name = permission.entity_name == entity_name or \
            permission.entity_name == EntityName.ALL or \
            (
                permission.entity_name == EntityName.ALL_EXCEPT_RESERVED and
                EntityName(entity_name) not in RESERVED_ENTITY_NAMES
            )

        if not correct_entity_name:
            return False

        if permission.access is None:
            return False

        # 2. Select permissions that disable access to this entity based on the action
        if disable_access is not None and permission.access & disable_access:
            return False

        # 3. Select permissions that grant access to this entity based on the action
        permission_accesses = PERMISSION_ACCESS_WITH_MULTIPLE_ACCESS.get(f'{permission.access}')
        if not permission_accesses:
            permission_accesses = [permission.access]

        return any([p.access & access for p in permission_accesses])

    permissions = list(filter(
        lambda permission: __should_select_permission_for_entity_name_with_access(permission),
        permissions,
    ))

    print(
        'WTFFFFFFFFFFFFFFFFFFFFFFFFFFFF3 validate_condition_with_permissions',
        entity_name,
        action,
        access,
        disable_access,
        permissions,
    )

    return permissions and len(permissions) >= 1


class UserPermissionMixIn:
    @classmethod
    def action_rule_with_permissions(self, action: OperationType) -> Dict:
        return {
            OauthScope.CLIENT_PRIVATE: dict(
                condition=build_validate_condition(action),
            ),
        }
