from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db.models.oauth import Role, UserRole


class UserRoleResource(DatabaseResource):
    model_class = UserRole


UserRoleResource.register_parent_model('role_id', Role)
