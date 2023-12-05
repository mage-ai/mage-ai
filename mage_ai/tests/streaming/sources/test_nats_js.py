from unittest.mock import patch

from mage_ai.streaming.sources.nats_js import NATSSource
from mage_ai.tests.base_test import TestCase


class NATSTests(TestCase):
    def test_init(self):
        with patch.object(NATSSource, 'init_client') as mock_init_client:
            NATSSource(
                dict(
                    connector_type='nats',
                    server_url='nats://localhost:4222',
                    subject='test_subject',
                    consumer_name='test_consumer',
                    stream_name='test_stream',
                )
            )
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        invalid_config = {
            'subject': 'test_subject',
            'consumer_name': 'test_consumer',
        }

        with patch.object(NATSSource, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                NATSSource(invalid_config)
            error_msg = "missing 2 required positional arguments: 'server_url' and 'stream_name'"
            self.assertIn(error_msg, str(context.exception))
            self.assertEqual(mock_init_client.call_count, 0)
