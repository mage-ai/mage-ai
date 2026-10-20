from unittest.mock import Mock, patch

from mage_ai.streaming.sinks.kafka import KafkaSink
from mage_ai.tests.base_test import TestCase


class KafkaSinkTests(TestCase):
    def test_init(self):
        with patch.object(KafkaSink, 'init_client') as mock_init_client:
            KafkaSink(dict(
                connector_type='kafka',
                bootstrap_server='test_server',
                topic='test_topic',
            ))
            mock_init_client.assert_called_once()

    def test_init_with_oauth_sasl_config(self):
        with patch.object(KafkaSink, 'init_client') as mock_init_client:
            sink = KafkaSink(dict(
                connector_type='kafka',
                bootstrap_server='test_server',
                topic='test_topic',
                security_protocol='SASL_SSL',
                sasl_config=dict(
                    mechanism='OAUTHBEARER',
                    oauth_token_url='https://auth.example.com/token',
                    oauth_client_id='test_client',
                    oauth_client_secret='test_secret',
                    oauth_scope='kafka',
                ),
            ))
            mock_init_client.assert_called_once()
            self.assertEqual(sink.config.security_protocol, 'SASL_SSL')
            self.assertEqual(sink.config.sasl_config.mechanism, 'OAUTHBEARER')
            self.assertEqual(
                sink.config.sasl_config.oauth_token_url, 'https://auth.example.com/token')
            self.assertEqual(sink.config.sasl_config.oauth_client_id, 'test_client')
            self.assertEqual(sink.config.sasl_config.oauth_client_secret, 'test_secret')
            self.assertEqual(sink.config.sasl_config.oauth_scope, 'kafka')
            self.assertIsNone(sink.config.ssl_config)

    def test_init_client_with_oauthbearer(self):
        kafka_config = dict(
            connector_type='kafka',
            bootstrap_server='test_server',
            topic='test_topic',
            security_protocol='SASL_SSL',
            sasl_config=dict(
                mechanism='OAUTHBEARER',
                oauth_token_url='https://auth.example.com/token',
                oauth_client_id='test_client',
                oauth_client_secret='test_secret',
            ),
        )

        with patch('mage_ai.streaming.sinks.kafka.KafkaProducer') as mock_producer:
            with patch('mage_ai.streaming.sources.kafka_oauth.requests.post') as mock_post:
                # Mock the OAuth token response
                mock_response = Mock()
                mock_response.json.return_value = {
                    'access_token': 'test_token',
                    'expires_in': 3600,
                }
                mock_response.raise_for_status = Mock()
                mock_post.return_value = mock_response
                
                KafkaSink(kafka_config)

        # Verify KafkaProducer was called with correct parameters
        self.assertEqual(mock_producer.call_count, 1)
        args, kwargs = mock_producer.call_args
        self.assertEqual(kwargs['bootstrap_servers'], 'test_server')
        self.assertEqual(kwargs['security_protocol'], 'SASL_SSL')
        self.assertEqual(kwargs['sasl_mechanism'], 'OAUTHBEARER')
        self.assertIn('sasl_oauth_token_provider', kwargs)
        self.assertIsNotNone(kwargs['sasl_oauth_token_provider'])

    def test_init_client_with_oauthbearer_missing_token_url(self):
        kafka_config = dict(
            connector_type='kafka',
            bootstrap_server='test_server',
            topic='test_topic',
            security_protocol='SASL_SSL',
            sasl_config=dict(
                mechanism='OAUTHBEARER',
                oauth_client_id='test_client',
                oauth_client_secret='test_secret',
            ),
        )

        with self.assertRaises(Exception) as context:
            KafkaSink(kafka_config)

        self.assertIn('oauth_token_url is required', str(context.exception))

    def test_init_client_with_oauthbearer_missing_client_id(self):
        kafka_config = dict(
            connector_type='kafka',
            bootstrap_server='test_server',
            topic='test_topic',
            security_protocol='SASL_SSL',
            sasl_config=dict(
                mechanism='OAUTHBEARER',
                oauth_token_url='https://auth.example.com/token',
                oauth_client_secret='test_secret',
            ),
        )

        with self.assertRaises(Exception) as context:
            KafkaSink(kafka_config)

        self.assertIn('oauth_client_id is required', str(context.exception))

    def test_init_client_with_oauthbearer_missing_client_secret(self):
        kafka_config = dict(
            connector_type='kafka',
            bootstrap_server='test_server',
            topic='test_topic',
            security_protocol='SASL_SSL',
            sasl_config=dict(
                mechanism='OAUTHBEARER',
                oauth_token_url='https://auth.example.com/token',
                oauth_client_id='test_client',
            ),
        )

        with self.assertRaises(Exception) as context:
            KafkaSink(kafka_config)

        self.assertIn('oauth_client_secret is required', str(context.exception))
