from unittest.mock import patch

from mage_ai.streaming.sources.kafka import KafkaSource
from mage_ai.tests.base_test import TestCase


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

    def test_init_with_sasl_config(self):
        with patch.object(KafkaSource, 'init_client') as mock_init_client:
            source = KafkaSource(dict(
                connector_type='kafka',
                bootstrap_server='test_server',
                consumer_group='test_group',
                topic='test_topic',
                security_protocol='SASL_SSL',
                sasl_config=dict(
                    mechanism='PLAIN',
                    username='test_username',
                    password='test_password',
                ),
            ))
            mock_init_client.assert_called_once()
            self.assertEqual(source.config.security_protocol, 'SASL_SSL')
            self.assertEqual(source.config.sasl_config.mechanism, 'PLAIN')
            self.assertEqual(source.config.sasl_config.username, 'test_username')
            self.assertEqual(source.config.sasl_config.password, 'test_password')
            self.assertIsNone(source.config.ssl_config)

    def test_init_with_serde_config(self):
        with patch.object(KafkaSource, 'init_client') as mock_init_client:
            source = KafkaSource(dict(
                connector_type='kafka',
                bootstrap_server='test_server',
                consumer_group='test_group',
                topic='test_topic',
                serde_config=dict(
                    serialization_method='PROTOBUF',
                    schema_classpath='mage_ai.tests.base_test.TestCase',
                )
            ))
            mock_init_client.assert_called_once()
            self.assertEqual(source.config.serde_config.serialization_method, 'PROTOBUF')
            self.assertEqual(
                source.config.serde_config.schema_classpath, 'mage_ai.tests.base_test.TestCase')
