from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import Permission, Role
from mage_ai.shared.hash import merge_dict


class PermissionResource(DatabaseResource):
    model_class = Permission

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        if 'entity_name' not in payload:
            payload['entity_name'] = ''

        return super().create(merge_dict(payload, dict(
            user_id=user.id if user else None,
        )), user, **kwargs)


PermissionResource.register_parent_model('role_id', Role)
