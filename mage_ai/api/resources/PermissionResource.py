from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db.models.oauth import Permission


class PermissionResource(DatabaseResource):
    model_class = Permission
