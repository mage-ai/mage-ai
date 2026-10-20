from mage_ai.streaming.sinks.kinesis import KinesisSink
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch


class KinesisTests(TestCase):
    def test_init(self):
        with patch.object(KinesisSink, 'init_client') as mock_init_client:
            KinesisSink(dict(
                connector_type='kinesis',
                stream_name='test_stream',
                partition_key='test_key',
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(KinesisSink, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                KinesisSink(dict(
                    connector_type='kinesis',
                    stream_name='test_stream',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'partition_key\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
