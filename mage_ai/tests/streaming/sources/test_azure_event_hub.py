from mage_ai.streaming.sources.azure_event_hub import AzureEventHubSource
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch


class KafkaTests(TestCase):
    def test_init(self):
        with patch.object(AzureEventHubSource, 'init_client') as mock_init_client:
            AzureEventHubSource(dict(
                connection_str='test_connection_str',
                eventhub_name='test_eventhub_name',
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(AzureEventHubSource, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                AzureEventHubSource(dict(
                    connection_str='test_connection_str',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'eventhub_name\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
