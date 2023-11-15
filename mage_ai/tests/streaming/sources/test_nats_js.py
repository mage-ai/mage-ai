from unittest.mock import patch

from mage_ai.streaming.sources.nats_js import NATSSource
from mage_ai.tests.base_test import TestCase


class NATSTests(TestCase):
    def setUp(self):
        self.nats_config = {
            'server_url': 'nats://localhost:4222',
            'subject': 'test_subject',
            'consumer_name': 'test_consumer',
        }

    def test_init(self):
        with patch.object(NATSSource, 'init_client') as mock_init_client:
            NATSSource(self.nats_config)
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        invalid_config = {
            'subject': 'test_subject',
            'consumer_name': 'test_consumer',
        }

        with patch.object(NATSSource, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                NATSSource(invalid_config)
            error_msg = "missing 1 required positional argument: 'server_url'"
            error_msg += "This is a long error message"
            self.assertIn(error_msg, str(context.exception))
            self.assertEqual(mock_init_client.call_count, 0)
