import uuid

from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db.models.oauth import Role
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
