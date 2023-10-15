from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.models.oauth import Role, RolePermission, User, UserRole
from mage_ai.shared.array import find
from mage_ai.shared.hash import extract, ignore_keys, index_by, merge_dict


class RoleResource(DatabaseResource):
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
            if entity != Entity.GLOBAL and entity_ids:
                permissions_query = permissions_query.filter(
                    Permission.entity_id.in_(entity_ids),
                )
            permissions = permissions_query.all()
            roles = []
            for permission in permissions:
                roles.append(permission.role)
            roles = list(filter(lambda x: x, roles))
        else:
            roles = Role.query.all()

        access = 0
        if user:
            access = user.get_access(Entity.PROJECT, get_project_uuid())

        if (access & Permission.Access.OWNER == 0) and limit_roles:
            role_access = Permission.Access.EDITOR | Permission.Access.VIEWER
            roles = list(filter(
                lambda role: role.get_access(
                    Entity.PROJECT,
                    get_project_uuid(),
                ) | role_access == role_access,  # Only editors and viewers
                roles,
            ))

        return self.build_result_set(roles, user, **kwargs)

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        return super().create(merge_dict(extract(payload, [
            'name',
        ]), dict(
            user_id=user.id if user else None,
        )), user, **kwargs)

    @safe_db_query
    def update(self, payload, **kwargs):
        permission_ids = [int(i) for i in payload.get('permission_ids') or []]
        role_permissions_mapping = index_by(lambda x: x.id, self.role_permissions or [])

        permission_ids_create = []
        permission_ids_delete = []

        for permission_id in permission_ids:
            if permission_id not in role_permissions_mapping:
                permission_ids_create.append(permission_id)

        for permission_id in role_permissions_mapping.keys():
            if permission_id not in permission_ids:
                permission_ids_delete.append(permission_id)

        if permission_ids_create:
            db_connection.session.bulk_save_objects(
                [RolePermission(
                    permission_id=permission_id,
                    role_id=self.model.id,
                    user_id=self.current_user.id if self.current_user else None,
                ) for permission_id in permission_ids_create],
                return_defaults=True,
            )

        if permission_ids_delete:
            delete_statement = RolePermission.__table__.delete().where(
                RolePermission.permission_id.in_(permission_ids_delete),
                RolePermission.role_id == self.id,
            )
            db_connection.session.execute(delete_statement)

        user_ids = [int(i) for i in payload.get('user_ids') or []]
        user_role_mapping = index_by(lambda x: x.id, self.users or [])

        user_ids_create = []
        user_ids_delete = []

        for permission_id in user_ids:
            if permission_id not in user_role_mapping:
                user_ids_create.append(permission_id)

        for permission_id in user_role_mapping.keys():
            if permission_id not in user_ids:
                user_ids_delete.append(permission_id)

        if user_ids_create:
            db_connection.session.bulk_save_objects(
                [UserRole(
                    role_id=self.model.id,
                    user_id=user_id,
                ) for user_id in user_ids_create],
                return_defaults=True,
            )

        if user_ids_delete:
            delete_statement = UserRole.__table__.delete().where(
                UserRole.role_id == self.id,
                UserRole.user_id.in_(user_ids_delete),
            )
            db_connection.session.execute(delete_statement)

        return super().update(ignore_keys(payload, [
            'permission_ids',
            'user_ids',
        ]), **kwargs)


def __load_permissions(resource):
    from mage_ai.api.resources.PermissionResource import PermissionResource

    ids = [r.id for r in resource.result_set()]

    return [PermissionResource(p, resource.current_user) for p in Role.fetch_permissions(ids)]


def __select_permissions(resource, arr):
    return [r for r in arr if r.role_id == resource.id]


def __load_role_permissions(resource):
    from mage_ai.api.resources.PermissionResource import PermissionResource

    ids = [r.id for r in resource.result_set()]

    return [PermissionResource(p, resource.current_user) for p in Role.fetch_role_permissions(ids)]


def __select_role_permissions(resource, arr):
    return [r for r in arr if r.role_id == resource.id]


def __load_users(resource):
    from mage_ai.api.resources.UserResource import UserResource

    ids = [r.id for r in resource.result_set()]

    return [UserResource(p, resource.current_user) for p in Role.fetch_users(ids)]


def __select_users(resource, arr):
    return [r for r in arr if r.role_id == resource.id]


def __load_users_created_role(resource):
    from mage_ai.api.resources.UserResource import UserResource

    ids = [r.user_id for r in resource.result_set()]

    return [UserResource(
        p,
        resource.current_user,
    ) for p in User.query.filter(User.id.in_(ids)).all()]


def __find_user_created_role(resource, arr):
    return find(lambda x: x.id == resource.user_id, arr)


RoleResource.register_collective_loader(
    'permissions',
    load=__load_permissions,
    select=__select_permissions,
)


RoleResource.register_collective_loader(
    'role_permissions',
    load=__load_role_permissions,
    select=__select_role_permissions,
)


RoleResource.register_collective_loader(
    'users',
    load=__load_users,
    select=__select_users,
)


RoleResource.register_collective_loader(
    'user',
    load=__load_users_created_role,
    select=__find_user_created_role,
)
