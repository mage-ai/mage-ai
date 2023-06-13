from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import Role


class RoleResource(GenericResource):
    model_class = Role

    @classmethod
    @safe_db_query
    def collection(self, query, meta, user, **kwargs):
        from mage_ai.orchestration.db.models.oauth import Permission

        limit_roles = query.get('limit_roles', [None])
        if limit_roles:
            limit_roles = limit_roles[0]

        entity = query.get('entity', [None])
        if entity:
            entity = entity[0]

        entity_ids = query.get('entity_ids[]', [])
        if entity_ids:
            entity_ids = entity_ids[0]
        if entity_ids:
            entity_ids = entity_ids.split(',')

        permissions_query = Permission.query
        if entity:
            permissions_query = permissions_query.filter(
                Permission.entity == entity,
            )
            if entity != Permission.Entity.GLOBAL and entity_ids:
                permissions_query = permissions_query.filter(
                    Permission.entity_id.in_(entity_ids),
                )
            permissions = permissions_query.all()
            roles = []
            for permission in permissions:
                roles.append(permission.role)
        else:
            roles = Role.query.all()

        access = 0
        if user:
            access = user.get_access(Permission.Entity.PROJECT, get_project_uuid())

        if (access & Permission.Access.OWNER == 0) and limit_roles:
            role_access = Permission.Access.EDITOR | Permission.Access.VIEWER
            roles = list(filter(
                lambda role: role.get_access(
                    Permission.Entity.PROJECT,
                    get_project_uuid(),
                ) | role_access == role_access,  # Only editors and viewers
                roles,
            ))

        return self.build_result_set(roles, user, **kwargs)
