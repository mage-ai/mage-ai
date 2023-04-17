from mage_ai.streaming.sources.amazon_sqs import AmazonSqsSource
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch


class AmazonSqsTests(TestCase):
    def test_init(self):
        with patch.object(AmazonSqsSource, 'init_client') as mock_init_client:
            AmazonSqsSource(dict(
                connector_type='amazon_sqs',
                queue_name='test_queue',
                batch_size=1,
                wait_time_seconds=1,
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(AmazonSqsSource, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                AmazonSqsSource(dict(
                    connector_type='amazon_sqs',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'queue_name\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)

    def test_init_with_serde_config(self):
        with patch.object(AmazonSqsSource, 'init_client') as mock_init_client:
            source = AmazonSqsSource(dict(
                connector_type='kafka',
                queue_name='test_queue',
                serde_config=dict(
                    serialization_method='JSON',
                )
            ))
            mock_init_client.assert_called_once()
            self.assertEqual(source.config.serde_config.serialization_method, 'JSON')
