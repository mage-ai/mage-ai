from mage_ai.streaming.sinks.amazon_s3 import AmazonS3Sink
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch


class AmazonS3Tests(TestCase):
    def test_init(self):
        with patch.object(AmazonS3Sink, 'init_client') as mock_init_client:
            AmazonS3Sink(dict(
                connector_type='amazon_s3',
                bucket='bucket',
                prefix='prefix',
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(AmazonS3Sink, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                AmazonS3Sink(dict(
                    connector_type='amazon_s3',
                    bucket='bucket',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'prefix\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
