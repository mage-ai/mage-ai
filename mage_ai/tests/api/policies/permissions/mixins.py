from typing import Dict, List, Union

from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.authentication.permissions.constants import EntityName, PermissionAccess
from mage_ai.orchestration.db.models.oauth import Permission, RolePermission, User

ENTITY_NAME = EntityName.Pipeline


class PermissionsMixin:
    def build_policy(
        self,
        entity_name: EntityName = None,
        current_user=None,
    ):
        class CustomTestWithPermissionsResource(GenericResource):
            model_class = User

        class CustomTestWithPermissionsPolicy(BasePolicy):
            @classmethod
            def entity_name_uuid(self):
                return entity_name or ENTITY_NAME

        model = dict(id=(current_user or self.user).id)
        resource = CustomTestWithPermissionsResource(model, self.user)

        return CustomTestWithPermissionsPolicy(resource, self.user)

    def create_permission(
        self,
        accesses: List[PermissionAccess],
        entity_name: EntityName = None,
        entity_id: Union[int, str] = None,
        options: Dict = None,
    ):
        permission = Permission.create(
            access=Permission.add_accesses(accesses),
            entity_name=entity_name or ENTITY_NAME,
            entity_id=entity_id,
            options=options,
        )
        RolePermission.create(permission_id=permission.id, role_id=self.role.id)
