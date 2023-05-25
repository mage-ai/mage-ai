from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.repo_manager import get_repo_path
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

        roles = Role.query.all()
        access = user.get_access(Permission.Entity.PROJECT, get_repo_path())
        if (access & Permission.Access.OWNER == 0) and limit_roles:
            role_access = Permission.Access.EDITOR | Permission.Access.VIEWER
            roles = list(filter(
                lambda role: role.get_access(
                    Permission.Entity.PROJECT,
                    get_repo_path(),
                ) | role_access == role_access,  # Only editors and viewers
                roles,
            ))

        return self.build_result_set(roles, user, **kwargs)
