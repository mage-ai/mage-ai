from unittest.mock import patch

from mage_ai.streaming.sinks.azure_data_lake import AzureDataLakeSink
from mage_ai.tests.base_test import TestCase


class AzureDLSTests(TestCase):
    def test_init(self):
        with patch.object(AzureDataLakeSink, 'init_client') as mock_init_client:
            AzureDataLakeSink(dict(
                table_uri='table_uri',
                account_name='account_name',
                access_key='access_key',
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(AzureDataLakeSink, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                AzureDataLakeSink(dict(
                    account_name='account_name',
                    access_key='access_key',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'table_uri\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
