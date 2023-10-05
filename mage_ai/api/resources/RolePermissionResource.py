from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db.models.oauth import Role, RolePermission


class RolePermissionResource(DatabaseResource):
    model_class = RolePermission


RolePermissionResource.register_parent_model('role_id', Role)
