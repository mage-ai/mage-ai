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

        roles = Role.query.all()
        access = user.get_access(Permission.Entity.PROJECT, get_repo_path())
        if access & 1 == 0:
            roles = list(filter(
                lambda role: role.get_access(
                    Permission.Entity.PROJECT,
                    get_repo_path(),
                ) & 3 == 0,
                roles,
            ))

        return self.build_result_set(roles, user, **kwargs)
