from mage_ai.api.middleware import parse_cookie_header
from mage_ai.api.utils import (
    has_at_least_editor_role,
    has_at_least_viewer_role,
    is_owner,
)
from mage_ai.authentication.passwords import create_bcrypt_hash, generate_salt
from mage_ai.orchestration.db.models.oauth import Permission, Role, User
from mage_ai.tests.base_test import DBTestCase


class UtilsTest(DBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        Role.create_default_roles()

    def test_cookie_parser(self):
        named_cookies = "csrftoken=5lkzK7FCI2iWy2xi7wbZPI7P26qbspIE; django_language=en"

        self.assertEqual(
            parse_cookie_header(named_cookies),
            {
                "csrftoken": "5lkzK7FCI2iWy2xi7wbZPI7P26qbspIE",
                "django_language": "en",
            },
        )

        unnamed_cookies = (
            "csrftoken=5lkzK7FCI2iWy2xi7wbZPI7P26qbspIE; unnamed; django_language=en"
        )

        self.assertEqual(
            parse_cookie_header(unnamed_cookies),
            {
                "csrftoken": "5lkzK7FCI2iWy2xi7wbZPI7P26qbspIE",
                "django_language": "en",
                "": "unnamed",
            },
        )

    def test_get_user_access_for_user_with_no_permissions(self):
        password_salt = generate_salt()
        user = User.create(
            email='no_access@admin.com',
            password_hash=create_bcrypt_hash('admin', password_salt),
            password_salt=password_salt,
            username='no_access',
        )

        access = user.get_access(None)
        self.assertEqual(0, access)

        access = user.get_access(Permission.Entity.ANY)
        self.assertEqual(0, access)

        access = user.get_access(Permission.Entity.GLOBAL, None)
        self.assertEqual(0, access)

        access = user.get_access(Permission.Entity.PIPELINE, 'test')
        self.assertEqual(0, access)

        self.assertFalse(is_owner(user))

    def test_get_user_access_for_global_owner(self):
        password_salt = generate_salt()
        user = User.create(
            email='admin@admin.com',
            password_hash=create_bcrypt_hash('admin', password_salt),
            password_salt=password_salt,
            roles_new=[Role.query.filter(Role.name == 'Owner').first()],
            username='admin',
        )

        access = user.get_access(None)
        self.assertEqual(0, access)

        access = user.get_access(Permission.Entity.ANY)
        self.assertEqual(1, access)

        access = user.get_access(Permission.Entity.GLOBAL, None)
        self.assertEqual(1, access)

        access = user.get_access(Permission.Entity.PIPELINE, 'test')
        self.assertEqual(1, access)

        self.assertTrue(is_owner(user))

    def test_get_user_access_for_pipeline_editor(self):
        password_salt = generate_salt()
        user = User.create(
            email='editor@edit.com',
            password_hash=create_bcrypt_hash('edit', password_salt),
            password_salt=password_salt,
            roles_new=[Role.create(
                name='pipeline_editor_1',
                permissions=[
                    Permission.create(
                        entity=Permission.Entity.PIPELINE,
                        entity_id='test',
                        access=4,
                    )
                ]
            )],
            username='editor',
        )
        access = user.get_access(Permission.Entity.ANY)
        self.assertEqual(4, access)

        access = user.get_access(Permission.Entity.GLOBAL, None)
        self.assertEqual(0, access)

        access = user.get_access(Permission.Entity.PIPELINE, 'test')
        self.assertEqual(4, access)

        access = user.get_access(Permission.Entity.PIPELINE, 'not_test')
        self.assertEqual(0, access)

        self.assertTrue(has_at_least_viewer_role(user, Permission.Entity.PIPELINE, 'test'))
        self.assertTrue(has_at_least_editor_role(user, Permission.Entity.PIPELINE, 'test'))

    def test_get_user_access_for_role_with_multiple_permissions(self):
        password_salt = generate_salt()
        user = User.create(
            email='editor2@edit.com',
            password_hash=create_bcrypt_hash('edit', password_salt),
            password_salt=password_salt,
            roles_new=[Role.create(
                name='pipeline_editor_2',
                permissions=[
                    Permission.create(
                        entity=Permission.Entity.PIPELINE,
                        entity_id='test',
                        access=4,
                    )
                ]
            ), Role.create(
                name='pipeline_viewer',
                permissions=[
                    Permission.create(
                        entity=Permission.Entity.PIPELINE,
                        entity_id='test',
                        access=8,
                    ),
                    Permission.create(
                        entity=Permission.Entity.PIPELINE,
                        entity_id='test1',
                        access=8,
                    )
                ]
            )],
            username='editor2',
        )
        access = user.get_access(Permission.Entity.ANY)
        self.assertEqual(12, access)

        access = user.get_access(Permission.Entity.GLOBAL, None)
        self.assertEqual(0, access)

        access = user.get_access(Permission.Entity.PIPELINE, 'test')
        self.assertEqual(12, access)

        access = user.get_access(Permission.Entity.PIPELINE, 'test1')
        self.assertEqual(8, access)

        access = user.get_access(Permission.Entity.PIPELINE, 'not_test')
        self.assertEqual(0, access)

        self.assertTrue(has_at_least_editor_role(user, Permission.Entity.PIPELINE, 'test'))
        self.assertFalse(has_at_least_editor_role(user, Permission.Entity.PIPELINE, 'test1'))
        self.assertTrue(has_at_least_viewer_role(user, Permission.Entity.PIPELINE, 'test1'))
