from mage_ai.streaming.sources.rabbitmq import PikaSource
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch


class PikaTests(TestCase):
    def test_init(self):
        with patch.object(PikaSource, 'init_client') as mock_init_client:
            PikaSource(dict(
                connection_host='localhost',
                connection_port='5672',
                queue_name='test_queue',
                configure_consume= False,
                username='guest',
                password='guest',
                amqp_url_virtual_host= r'%2f',
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(PikaSource, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                PikaSource(dict(
                connection_port='5672',
                queue_name='test_queue',
                configure_consume= False,
                username='guest',
                password='guest',
                amqp_url_virtual_host= r'%2f',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'connection_host\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)