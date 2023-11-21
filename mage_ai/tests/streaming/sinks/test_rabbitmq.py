from unittest.mock import patch

from mage_ai.streaming.sinks.rabbitmq import RabbitMQSink
from mage_ai.tests.base_test import TestCase


class KinesisTests(TestCase):
    def test_init(self):
        with patch.object(RabbitMQSink, 'init_client') as mock_init_client:
            RabbitMQSink(dict(
                connector_type='rabbitmq',
                connection_host='localhost',
                connection_port='5672',
                queue_name='queue_name',
                username='guest',
                password='guest',
                amqp_url_virtual_host='%2f',
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(RabbitMQSink, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                RabbitMQSink(dict(
                    connector_type='rabbitmq',
                    connection_port='5672',
                    queue_name='queue_name',
                    username='guest',
                    password='guest',
                    amqp_url_virtual_host='%2f',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'connection_host\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
