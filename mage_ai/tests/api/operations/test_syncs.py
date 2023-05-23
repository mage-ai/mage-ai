import os

import inflection

from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.repo_manager import MAGE_DATA_DIR_ENV_VAR
from mage_ai.data_preparation.shared.secrets import get_secret_value
from mage_ai.tests.api.operations.base import BaseApiTestCase
from mage_ai.tests.factory import create_user


class SyncOperationTests(BaseApiTestCase):
    @property
    def model_class_name(self) -> str:
        return 'sync'

    @property
    def model_class_name_plural(self) -> str:
        return inflection.pluralize(self.model_class_name)

    @classmethod
    def setUpClass(self):
        super().setUpClass()
        os.environ[MAGE_DATA_DIR_ENV_VAR] = self.repo_path

    async def asyncTearDown(self):
        # super().asyncTearDown()
        os.remove(get_preferences().preferences_file_path)

    async def test_execute_create_user(self):
        email = self.faker.email()
        user = create_user(email=email, roles=1)
        operation = self.build_create_operation(
            dict(
                remote_repo_link='test_link',
                repo_path=self.repo_path,
                branch='main',
                auth_type='https',
                user_git_settings=dict(
                    username='username1',
                    email=email,
                    access_token='abc123',
                ),
            ),
            user=user
        )
        response = await operation.execute()
        self.assertEqual(response['sync']['remote_repo_link'], 'test_link')

        preferences = get_preferences(user=user).sync_config
        self.assertEqual(preferences['remote_repo_link'], 'test_link')
        self.assertEqual(preferences['username'], 'username1')

        preferences = get_preferences().sync_config
        print('response:', preferences)
        self.assertEqual(preferences['remote_repo_link'], 'test_link')
        self.assertIsNone(preferences.get('username'))

        self.assertEqual(user.git_settings['username'], 'username1')
        self.assertEqual(
            get_secret_value(user.git_settings['access_token_secret_name']),
            'abc123',
        )

    async def test_execute_create_both(self):
        email = self.faker.email()
        user = create_user(email=email, roles=1)
        operation = self.build_create_operation(
            dict(
                remote_repo_link='test_link',
                repo_path=self.repo_path,
                branch='main',
                auth_type='https',
                username='username',
                email='admin@admin.com',
                access_token='abc123',
                user_git_settings=dict(
                    username='another_username',
                    email=email,
                    access_token='def456',
                )
            ),
            user=user,
        )
        response = await operation.execute()
        self.assertEqual(response['sync']['remote_repo_link'], 'test_link')

        preferences = get_preferences(user=user).sync_config
        project_preferences = get_preferences().sync_config
        self.assertEqual(preferences['username'], 'another_username')
        self.assertEqual(project_preferences['username'], 'username')
        self.assertEqual(user.git_settings['email'], email)
        self.assertEqual(
            get_secret_value(project_preferences['access_token_secret_name']),
            'abc123',
        )
        self.assertEqual(get_secret_value(user.git_settings['access_token_secret_name']), 'def456')
