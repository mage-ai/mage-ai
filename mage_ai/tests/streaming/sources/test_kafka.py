from unittest.mock import Mock, patch

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

    def test_init_client_with_topic(self):
        kafka_config = dict(
            connector_type='kafka',
            bootstrap_server='test_server',
            consumer_group='test_group',
            topic='test_topic',
        )

        with patch('mage_ai.streaming.sources.kafka.KafkaConsumer') as mock_consumer:
            KafkaSource(kafka_config)

        mock_consumer.assert_called_once_with(
            'test_topic',
            group_id='test_group',
            bootstrap_servers='test_server',
            api_version='0.10.2',
            auto_offset_reset='latest',
            max_partition_fetch_bytes=1048576,
            enable_auto_commit=False,
        )

    def test_init_client_with_topics(self):
        kafka_config = dict(
            connector_type='kafka',
            bootstrap_server='test_server',
            consumer_group='test_group',
            topics=['test_topic', 'test_topic2'],
        )

        # Mock the KafkaConsumer initialization
        with patch('mage_ai.streaming.sources.kafka.KafkaConsumer') as mock_consumer:
            KafkaSource(kafka_config)

        mock_consumer.assert_called_once_with(
            'test_topic',
            'test_topic2',
            group_id='test_group',
            bootstrap_servers='test_server',
            api_version='0.10.2',
            auto_offset_reset='latest',
            max_partition_fetch_bytes=1048576,
            enable_auto_commit=False,
        )

    def test_init_client_with_missing_topic_or_topics(self):
        kafka_config = dict(
            connector_type='kafka',
            bootstrap_server='test_server',
            consumer_group='test_group',
        )

        with self.assertRaises(Exception) as context:
            KafkaSource(kafka_config)

        self.assertEqual(
            str(context.exception), 'Please specify topic or topics in the Kafka config.')

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

    def test_init_with_oauth_sasl_config(self):
        with patch.object(KafkaSource, 'init_client') as mock_init_client:
            source = KafkaSource(dict(
                connector_type='kafka',
                bootstrap_server='test_server',
                consumer_group='test_group',
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
            self.assertEqual(source.config.security_protocol, 'SASL_SSL')
            self.assertEqual(source.config.sasl_config.mechanism, 'OAUTHBEARER')
            self.assertEqual(
                source.config.sasl_config.oauth_token_url, 'https://auth.example.com/token')
            self.assertEqual(source.config.sasl_config.oauth_client_id, 'test_client')
            self.assertEqual(source.config.sasl_config.oauth_client_secret, 'test_secret')
            self.assertEqual(source.config.sasl_config.oauth_scope, 'kafka')
            self.assertIsNone(source.config.ssl_config)

    def test_init_client_with_oauthbearer(self):
        kafka_config = dict(
            connector_type='kafka',
            bootstrap_server='test_server',
            consumer_group='test_group',
            topic='test_topic',
            security_protocol='SASL_SSL',
            sasl_config=dict(
                mechanism='OAUTHBEARER',
                oauth_token_url='https://auth.example.com/token',
                oauth_client_id='test_client',
                oauth_client_secret='test_secret',
            ),
        )

        with patch('mage_ai.streaming.sources.kafka.KafkaConsumer') as mock_consumer:
            with patch('mage_ai.streaming.sources.kafka_oauth.requests.post') as mock_post:
                # Mock the OAuth token response
                mock_response = Mock()
                mock_response.json.return_value = {
                    'access_token': 'test_token',
                    'expires_in': 3600,
                }
                mock_response.raise_for_status = Mock()
                mock_post.return_value = mock_response
                
                KafkaSource(kafka_config)

        # Verify KafkaConsumer was called with correct parameters
        self.assertEqual(mock_consumer.call_count, 1)
        args, kwargs = mock_consumer.call_args
        self.assertEqual(args, ('test_topic',))
        self.assertEqual(kwargs['group_id'], 'test_group')
        self.assertEqual(kwargs['bootstrap_servers'], 'test_server')
        self.assertEqual(kwargs['security_protocol'], 'SASL_SSL')
        self.assertEqual(kwargs['sasl_mechanism'], 'OAUTHBEARER')
        self.assertIn('sasl_oauth_token_provider', kwargs)
        self.assertIsNotNone(kwargs['sasl_oauth_token_provider'])

    def test_init_client_with_oauthbearer_missing_token_url(self):
        kafka_config = dict(
            connector_type='kafka',
            bootstrap_server='test_server',
            consumer_group='test_group',
            topic='test_topic',
            security_protocol='SASL_SSL',
            sasl_config=dict(
                mechanism='OAUTHBEARER',
                oauth_client_id='test_client',
                oauth_client_secret='test_secret',
            ),
        )

        with self.assertRaises(Exception) as context:
            KafkaSource(kafka_config)

        self.assertIn('oauth_token_url is required', str(context.exception))

    def test_init_client_with_oauthbearer_missing_client_id(self):
        kafka_config = dict(
            connector_type='kafka',
            bootstrap_server='test_server',
            consumer_group='test_group',
            topic='test_topic',
            security_protocol='SASL_SSL',
            sasl_config=dict(
                mechanism='OAUTHBEARER',
                oauth_token_url='https://auth.example.com/token',
                oauth_client_secret='test_secret',
            ),
        )

        with self.assertRaises(Exception) as context:
            KafkaSource(kafka_config)

        self.assertIn('oauth_client_id is required', str(context.exception))

    def test_init_client_with_oauthbearer_missing_client_secret(self):
        kafka_config = dict(
            connector_type='kafka',
            bootstrap_server='test_server',
            consumer_group='test_group',
            topic='test_topic',
            security_protocol='SASL_SSL',
            sasl_config=dict(
                mechanism='OAUTHBEARER',
                oauth_token_url='https://auth.example.com/token',
                oauth_client_id='test_client',
            ),
        )

        with self.assertRaises(Exception) as context:
            KafkaSource(kafka_config)

        self.assertIn('oauth_client_secret is required', str(context.exception))

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
