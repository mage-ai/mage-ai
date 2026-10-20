from unittest.mock import patch

from mage_ai.streaming.sources.activemq import ActiveMQSource
from mage_ai.tests.base_test import TestCase


class ActiveMQTests(TestCase):
    def test_init(self):
        with patch.object(ActiveMQSource, 'init_client') as mock_init_client:
            ActiveMQSource(dict(
                connection_host='localhost',
                connection_port='61613',
                queue_name='test_queue',
                username='guest',
                password='guest',
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(ActiveMQSource, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                ActiveMQSource(dict(
                    connection_port='61613',
                    queue_name='test_queue',
                    username='guest',
                    password='guest',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'connection_host\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
