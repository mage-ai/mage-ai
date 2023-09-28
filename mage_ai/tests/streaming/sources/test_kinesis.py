from mage_ai.streaming.sources.kinesis import KinesisSource
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch


class KinesisTests(TestCase):
    def test_init(self):
        with patch.object(KinesisSource, 'init_client') as mock_init_client:
            KinesisSource(dict(
                connector_type='kinesis',
                stream_name='test_stream',
                batch_size=100,
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(KinesisSource, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                KinesisSource(dict(
                    connector_type='kinesis',
                    batch_size=100,
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'stream_name\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
