import os
from unittest.mock import patch

from mage_ai.data_preparation.shared.secrets import (
    create_secret,
    delete_secret,
    get_secret_value,
)
from mage_ai.orchestration.db.models.secrets import Secret
from mage_ai.tests.base_test import DBTestCase


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
