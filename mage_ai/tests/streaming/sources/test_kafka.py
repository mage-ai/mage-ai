from mage_ai.streaming.sources.kafka import KafkaSource
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch


class KafkaTests(TestCase):
    def test_init(self):
        with patch.object(KafkaSource, 'init_client') as mock_init_client:
            KafkaSource(dict(
                connector_type='kafka',
                bootstrap_server='test_server',
                consumer_group='test_group',
                topic='test_topic',
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(KafkaSource, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                KafkaSource(dict(
                    connector_type='kafka',
                    bootstrap_server='test_server',
                    consumer_group='test_group',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'topic\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
