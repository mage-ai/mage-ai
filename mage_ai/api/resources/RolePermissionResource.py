from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import Role, RolePermission
from mage_ai.shared.hash import ignore_keys, merge_dict


class RolePermissionResource(DatabaseResource):
    model_class = RolePermission

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        payload_updated = merge_dict(payload, dict(
            user_id=user.id if user else None,
        ))

        resources = []
        if 'permission_ids' in payload_updated:
            permission_ids = payload_updated.get('permission_ids') or []

            for permission_id in permission_ids:
                resources.append(super().create(merge_dict(
                    ignore_keys(payload_updated, ['permission_ids']),
                    dict(permission_id=permission_id),
                ), user, **kwargs))

            return resources[0] if len(resources) >= 1 else self(None, user, **kwargs)

        return super().create(payload_updated, user, **kwargs)


RolePermissionResource.register_parent_model('role_id', Role)
