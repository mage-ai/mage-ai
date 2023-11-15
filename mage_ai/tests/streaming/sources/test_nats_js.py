from unittest.mock import AsyncMock, MagicMock, patch

from mage_ai.streaming.sources.nats_js import NATSSource
from mage_ai.tests.base_test import TestCase


class NATSTests(TestCase):
    def setUp(self):
        self.nats_config = dict(
            server_url='nats://localhost:4222',
            subject='test_subject',
            consumer_name='test_consumer',
        )

    @patch('nats.connect', new_callable=AsyncMock)
    @patch('nats.aio.client.Client.jetstream', new_callable=AsyncMock)
    @patch('nats.aio.client.JetStreamContext.add_stream', new_callable=AsyncMock)
    @patch('nats.aio.client.JetStreamContext.pull_subscribe', new_callable=AsyncMock)
    def test_full_workflow(
        self,
        mock_pull_subscribe,
        mock_add_stream,
        mock_jetstream,
        mock_connect
    ):
        mock_pull_subscribe.return_value = MagicMock(fetch=AsyncMock())
        source = NATSSource(self.nats_config)
        source.init_client()
        mock_connect.assert_called_once()
        mock_jetstream.assert_called_once()
        mock_add_stream.assert_called_once()
        mock_pull_subscribe.assert_called_once()

    def test_init(self):
        with patch.object(NATSSource, 'init_client') as mock_init_client:
            NATSSource(self.nats_config)
            mock_init_client.assert_called_once()

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
