import uuid

from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db.models.oauth import (
    Permission,
    Role,
    RolePermission,
    User,
    UserRole,
)
from mage_ai.tests.base_test import DBTestCase


class RoleTests(DBTestCase):
    def test_create_default_roles(self):
        Role.create_default_roles()

        owner = Role.query.filter(Role.name == 'Owner').one_or_none()
        self.assertIsNotNone(owner)

    def test_create_default_roles_project(self):
        test_entity_id = uuid.uuid4().hex
        Role.create_default_roles(
            entity=Entity.PROJECT,
            entity_id=test_entity_id,
            name_func=lambda x: f'test_{x}',
        )
        owner = Role.query.filter(Role.name == 'test_Owner').one_or_none()

        self.assertEqual(owner.get_access(entity=Entity.PROJECT, entity_id=test_entity_id), 1)

    def test_create_default_roles_multiple_projects(self):
        test_entity_id = uuid.uuid4().hex
        test_entity_id2 = uuid.uuid4().hex
        Role.create_default_roles(
            entity=Entity.PROJECT,
            entity_id=test_entity_id,
            name_func=lambda x: f'test-2_{x}',
        )
        Role.create_default_roles(
            entity=Entity.PROJECT,
            entity_id=test_entity_id2,
            name_func=lambda x: f'test-2_{x}',
        )
        owner = Role.query.filter(Role.name == 'test-2_Owner').one_or_none()

        self.assertEqual(owner.get_access(entity=Entity.PROJECT, entity_id=test_entity_id), 1)
        self.assertEqual(owner.get_access(entity=Entity.PROJECT, entity_id=test_entity_id2), 1)


class UserPermissionTests(DBTestCase):
    def test_fetch_permissions_deduplicates_permissions_from_multiple_roles(self):
        user = User.create(email='user-permissions@test.com')
        roles = [Role.create(name=f'permission-role-{index}') for index in range(2)]
        permission = Permission.create(access=Permission.Access.VIEWER)

        for role in roles:
            UserRole.create(user_id=user.id, role_id=role.id)
            RolePermission.create(permission_id=permission.id, role_id=role.id)

        permissions = User.fetch_permissions([user.id])

        self.assertEqual([permission.id], [model.id for model in permissions])
        self.assertEqual(user.id, permissions[0].user_id)

    def test_permission_users_deduplicates_users_with_multiple_roles(self):
        user = User.create(email='permission-users@test.com')
        roles = [Role.create(name=f'user-role-{index}') for index in range(2)]
        permission = Permission.create(access=Permission.Access.VIEWER)

        for role in roles:
            UserRole.create(user_id=user.id, role_id=role.id)
            RolePermission.create(permission_id=permission.id, role_id=role.id)

        users = permission.users()

        self.assertEqual([user.id], [model.id for model in users])
