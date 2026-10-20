from unittest.mock import patch

from mage_ai.streaming.sinks.google_cloud_storage import GoogleCloudStorageSink
from mage_ai.tests.base_test import TestCase


class GoogleCloudStorageTests(TestCase):
    def test_init(self):
        with patch.object(GoogleCloudStorageSink, 'init_client') as mock_init_client:
            GoogleCloudStorageSink(dict(
                connector_type='google_cloud_storage',
                bucket='bucket',
                prefix='prefix',
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(GoogleCloudStorageSink, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                GoogleCloudStorageSink(dict(
                    connector_type='google_cloud_storage',
                    bucket='bucket',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'prefix\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
