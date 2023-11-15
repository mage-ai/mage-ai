from unittest.mock import MagicMock, patch

from mage_ai.streaming.sources.nats_js import NATSSource
from mage_ai.tests.base_test import TestCase


class NATSTests(TestCase):
    def setUp(self):
        self.nats_config = dict(
            connector_type='nats',
            server_url='nats://localhost:4222',
            subject='test_subject',
            consumer_name='test_consumer',
        )

    def test_init(self):
        with patch.object(NATSSource, 'init_client') as mock_init_client:
            NATSSource(self.nats_config)
            mock_init_client.assert_called_once()

    def test_init_client(self):
        with patch('nats.connect') as mock_connect, \
             patch('nats.aio.client.Client.jetstream') as mock_jetstream:
            NATSSource(self.nats_config)
            mock_connect.assert_called_once_with('nats://localhost:4222')
            mock_jetstream.assert_called_once()

    def test_init_with_ssl_config(self):
        ssl_config = dict(
            cafile='/path/to/cafile',
            certfile='/path/to/certfile',
            keyfile='/path/to/keyfile',
            password='test_password',
            check_hostname=True,
        )
        self.nats_config['ssl_config'] = ssl_config

        with patch.object(NATSSource, 'init_client') as mock_init_client:
            source = NATSSource(self.nats_config)
            mock_init_client.assert_called_once()
            self.assertTrue(source.config.use_tls)
            self.assertEqual(source.config.ssl_config.cafile, '/path/to/cafile')
            self.assertEqual(source.config.ssl_config.certfile, '/path/to/certfile')
            self.assertEqual(source.config.ssl_config.keyfile, '/path/to/keyfile')
            self.assertEqual(source.config.ssl_config.password, 'test_password')
            self.assertTrue(source.config.ssl_config.check_hostname)

    def test_batch_read(self):
        mock_handler = MagicMock()
        with patch.object(NATSSource, 'fetch_messages', return_value=['msg1', 'msg2']):
            source = NATSSource(self.nats_config)
            source.batch_read(mock_handler)
            mock_handler.assert_called_once_with(['msg1', 'msg2'])

    def test_read(self):
        mock_handler = MagicMock()
        with patch.object(
            NATSSource,
            'fetch_messages',
            side_effect=[
                ['msg1'],
                [],
                Exception('Done')
            ]
        ):
            source = NATSSource(self.nats_config)
            source.read(mock_handler)
            mock_handler.assert_called_once_with('msg1')
