import os
import shutil
from unittest.mock import patch
from uuid import uuid4

import yaml

from mage_ai.data_preparation.shared.secrets import (
    _get_encryption_key,
    create_secret,
    delete_secret,
    get_secret_value,
)
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db.models.secrets import Secret
from mage_ai.settings.platform import platform_settings_full_path
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.io import safe_write
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.settings.test_platform import SETTINGS
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


class SecretTests(DBTestCase):
    @patch('mage_ai.data_preparation.shared.secrets.get_data_dir')
    def test_create_secret(self, mock_data_dir):
        mock_data_dir.return_value = os.path.join(self.repo_path, 'data')

        secret = create_secret('test_secret', '123')

        self.assertIsNotNone(secret)

        self.assertEqual(get_secret_value('test_secret'), '123')

    @patch('mage_ai.data_preparation.shared.secrets.get_data_dir')
    def test_delete_secret(self, mock_data_dir):
        mock_data_dir.return_value = os.path.join(self.repo_path, 'data')

        secret = create_secret('test_secret_delete', 'abc')

        self.assertIsNotNone(secret)

        self.assertEqual(get_secret_value('test_secret_delete'), 'abc')

        delete_secret('test_secret_delete')

        self.assertIsNone(get_secret_value('test_secret_delete'))

    @patch('mage_ai.data_preparation.shared.secrets.get_data_dir')
    def test_get_secret_value_with_multiple_secrets(self, mock_data_dir):
        mock_data_dir.return_value = os.path.join(self.repo_path, 'data')

        # this secret will not have a key_uuid set, so we should default to the other
        # secret value
        Secret.create(
            name='secret1',
            value='random_value',
            repo_name=self.repo_path,
        )

        create_secret(
            name='secret1',
            value='real_value',
        )

        self.assertEqual(get_secret_value('secret1'), 'real_value')

    @patch('mage_ai.data_preparation.shared.secrets.get_data_dir')
    def test_key_uuid_with_whitespace(self, mock_data_dir):
        data_dir = os.path.join(self.repo_path, 'data')
        mock_data_dir.return_value = data_dir

        _, key_uuid = _get_encryption_key(Entity.GLOBAL)

        create_secret('secret6', 'value')

        with open(os.path.join(data_dir, 'secrets', 'uuid'), 'w') as f:
            f.write('  ' + key_uuid + '\n ')

        self.assertEqual(get_secret_value('secret6'), 'value')


class SecretProjectPlatformTest(ProjectPlatformMixin, DBTestCase):
    @patch('mage_ai.data_preparation.shared.secrets.get_data_dir')
    def test_create_secret(self, mock_data_dir):
        with patch(
            'mage_ai.data_preparation.models.project.project_platform_activated',
            lambda: True,
        ):
            with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
                with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
                    mock_data_dir.return_value = os.path.join(self.repo_path, 'data')

                    secret = create_secret(uuid4().hex, '123')

                    self.assertIsNotNone(secret)

                    self.assertEqual(get_secret_value(secret.name), '123')

                    self.assertEqual(
                        secret.repo_name,
                        os.path.join(base_repo_path(), 'mage_platform'),
                    )

                    content = yaml.dump(SETTINGS)
                    safe_write(platform_settings_full_path(), content)

                    secret = create_secret(uuid4().hex, '123')
                    self.assertEqual(
                        secret.repo_name,
                        os.path.join(os.path.dirname(base_repo_path()), 'default_repo2'),
                    )

                    try:
                        shutil.rmtree(platform_settings_full_path())
                    except Exception:
                        pass

    # @patch('mage_ai.data_preparation.shared.secrets.get_data_dir')
    # def test_get_valid_secrets_for_repo(self, mock_data_dir):
    #     with patch('mage_ai.settings.platform.project_platform_activated', lambda: False):
    #         try:
    #             shutil.rmtree(platform_settings_full_path())
    #         except Exception:
    #             pass
    #         mock_data_dir.return_value = os.path.join(base_repo_path(), 'data')
    #         secret = create_secret(uuid4().hex, '123')

    #         self.assertTrue(secret.name in [s.name for s in get_valid_secrets_for_repo()])

    #     with patch(
    #         'mage_ai.data_preparation.models.project.project_platform_activated',
    #         lambda: True,
    #     ):
    #         with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
    #             with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
    #                 content = yaml.dump(SETTINGS)
    #                 safe_write(platform_settings_full_path(), content)

    #                 secret2 = create_secret(uuid4().hex, '123')
    #                 secrets = [s.name for s in get_valid_secrets_for_repo()]
    #                 self.assertTrue(secret2.name in secrets)
    #                 self.assertFalse(secret.name in secrets)

    #                 try:
    #                     shutil.rmtree(platform_settings_full_path())
    #                 except Exception:
    #                     pass

    @patch('mage_ai.data_preparation.shared.secrets.get_data_dir')
    def test_get_secret_value(self, mock_data_dir):
        with patch(
            'mage_ai.data_preparation.models.project.project_platform_activated',
            lambda: True,
        ):
            with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
                mock_data_dir.return_value = os.path.join(base_repo_path(), 'data')
                content = yaml.dump(SETTINGS)
                safe_write(platform_settings_full_path(), content)

                secret = create_secret(uuid4().hex, '123')
                self.assertEqual(
                    secret.repo_name,
                    os.path.join(os.path.dirname(base_repo_path()), 'default_repo2'),
                )
                self.assertEqual(get_secret_value(secret.name), '123')
