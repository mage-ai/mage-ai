import asyncio
import os
import shutil
from unittest.mock import patch

import tornado.httputil
import tornado.ioloop

import mage_ai.server.server as server_module
from mage_ai.authentication.passwords import create_bcrypt_hash, generate_salt
from mage_ai.data_preparation.repo_manager import ProjectType, get_project_uuid
from mage_ai.orchestration.db.models.oauth import (
    Oauth2Application,
    Permission,
    Role,
    User,
    UserRole,
)
from mage_ai.server.server import (
    initialize_user_authentication,
    make_app,
    replace_base_path,
)
from mage_ai.tests.base_test import AsyncDBTestCase


class ServerTests(AsyncDBTestCase):
    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

        super().setUp()

    def tearDown(self):
        self.loop.close()
        tornado.ioloop.IOLoop.instance().stop()

        # clean up oauth models
        Oauth2Application.query.delete()
        Permission.query.delete()
        UserRole.query.delete()
        Role.query.delete()
        User.query.delete()

        super().tearDown()

    def test_make_app(self):
        app = make_app()

        self.assertIsNotNone(app)

    @patch('mage_ai.server.server.ROUTES_BASE_PATH', 'test_prefix')
    def test_make_app_with_update_routes(self):
        app = make_app(update_routes=True)
        request = tornado.httputil.HTTPServerRequest(
            method='GET',
            uri='/test_prefix',
        )
        handler = app.default_router.find_handler(request)
        self.assertIsNotNone(handler)

        request = tornado.httputil.HTTPServerRequest(
            method='GET',
            uri='/test_prefix/pipelines',
        )
        handler = app.default_router.find_handler(request)
        self.assertIsNotNone(handler)

        request = tornado.httputil.HTTPServerRequest(
            method='GET',
            uri='/pipelines',
        )
        handler = app.default_router.find_handler(request)
        self.assertIsNone(handler)

    @patch('mage_ai.server.server.REQUESTS_BASE_PATH', 'random-test-string-1hasdfh')
    @patch('mage_ai.server.server.get_variables_dir')
    def test_replace_base_path(self, mock_variables_dir):
        mock_variables_dir.return_value = os.path.dirname(server_module.__file__)
        with patch(
            'mage_ai.server.server.BASE_PATH_EXPORTS_FOLDER',
            'base_path_test',
        ):
            replace_base_path(base_path='test_prefix')

        test_dir = os.path.join(os.path.dirname(server_module.__file__), 'base_path_test')
        self.assertTrue(len(os.listdir(test_dir)) > 0)
        with open(os.path.join(test_dir, 'index.html'), 'r') as f:
            self.assertNotEqual(f.read().find('random-test-string-1hasdfh'), 0)
        shutil.rmtree(test_dir)

    @patch('mage_ai.server.server.REQUESTS_BASE_PATH', 'test_prefix')
    @patch('mage_ai.server.server.get_variables_dir')
    def test_replace_base_path_directory_exists(self, mock_variables_dir):
        mock_variables_dir.return_value = os.path.dirname(server_module.__file__)
        test_dir = os.path.join(os.path.dirname(server_module.__file__), 'base_path_test')
        os.makedirs(test_dir)
        with patch(
            'mage_ai.server.server.BASE_PATH_EXPORTS_FOLDER',
            'base_path_test',
        ):
            replace_base_path(base_path='test_prefix')

        self.assertTrue(len(os.listdir(test_dir)) > 0)
        shutil.rmtree(test_dir)

    @patch('mage_ai.server.server.REQUESTS_BASE_PATH', 'test_prefix')
    @patch('mage_ai.server.server.get_variables_dir')
    def test_replace_base_path_s3_directory(self, mock_variables_dir):
        mock_variables_dir.return_value = 's3://test-bucket/test-prefix'
        test_dir = os.path.join(self.repo_path, 'base_path_test')
        with patch(
            'mage_ai.server.server.DEFAULT_MAGE_DATA_DIR',
            test_dir,
        ):
            replace_base_path(base_path='test_prefix')

        self.assertTrue(len(os.listdir(os.path.join(test_dir, 'test'))) > 0)
        shutil.rmtree(test_dir)

    def test_initialize_user_authentication_standalone_project(self):
        initialize_user_authentication(ProjectType.STANDALONE)

        owner_role = Role.get_role(Role.DefaultRole.OWNER)
        self.assertTrue(len(owner_role.users) > 0)

        owner_user = User.query.filter(User.email == 'admin@admin.com').one_or_none()
        self.assertIsNotNone(owner_user)

    def test_initialize_user_authentication_standalone_project_with_existing_owner(self):
        password_salt = generate_salt()
        Role.create_default_roles()
        owner_role = Role.get_role(Role.DefaultRole.OWNER)
        User.create(
            email='admin@admin.com',
            password_hash=create_bcrypt_hash('admin', password_salt),
            password_salt=password_salt,
            roles_new=[owner_role],
            username='admin',
        )
        initialize_user_authentication(ProjectType.STANDALONE)

        owner_role = Role.get_role(Role.DefaultRole.OWNER)
        self.assertTrue(len(owner_role.users) > 0)

        owner_user = User.query.filter(User.email == 'admin@admin.com').one_or_none()
        self.assertIsNotNone(owner_user)

    def test_initialize_user_authentication_subproject(self):
        initialize_user_authentication(ProjectType.SUB)

        project_uuid = get_project_uuid()
        project_uuid_truncated = project_uuid[:8]

        owner_role = Role.get_role(f'{Role.DefaultRole.OWNER}_{project_uuid_truncated}')
        self.assertTrue(len(owner_role.users) > 0)

        owner_user = User.query.filter(User.email == 'admin@admin.com').one_or_none()
        self.assertIsNotNone(owner_user)

    def test_initialize_user_authentication_subproject_with_existing_owner(self):
        password_salt = generate_salt()
        Role.create_default_roles()
        owner_role = Role.get_role(Role.DefaultRole.OWNER)
        User.create(
            email='admin@admin.com',
            password_hash=create_bcrypt_hash('admin', password_salt),
            password_salt=password_salt,
            roles_new=[owner_role],
            username='admin',
        )
        initialize_user_authentication(ProjectType.SUB)

        project_uuid = get_project_uuid()
        project_uuid_truncated = project_uuid[:8]
        owner_role = Role.get_role(f'{Role.DefaultRole.OWNER}_{project_uuid_truncated}')
        self.assertTrue(len(owner_role.users) == 0)

        owner_user = User.query.filter(User.email == 'admin@admin.com').one_or_none()
        self.assertIsNotNone(owner_user)

    def test_initialize_user_authentication_subproject_admin_exists(self):
        password_salt = generate_salt()
        owner_role = Role.get_role(Role.DefaultRole.OWNER)
        User.create(
            email='admin@admin.com',
            password_hash=create_bcrypt_hash('admin', password_salt),
            password_salt=password_salt,
            username='admin',
        )
        initialize_user_authentication(ProjectType.SUB)

        project_uuid = get_project_uuid()
        project_uuid_truncated = project_uuid[:8]
        owner_role = Role.get_role(f'{Role.DefaultRole.OWNER}_{project_uuid_truncated}')
        self.assertTrue(len(owner_role.users) == 0)

        owner_user = User.query.filter(User.email == 'admin@admin.com').one_or_none()
        self.assertIsNotNone(owner_user)
