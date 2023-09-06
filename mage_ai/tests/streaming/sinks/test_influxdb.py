from mage_ai.streaming.sinks.influxdb import InfluxDbSink
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch


class InfluxDbTests(TestCase):
    def test_init(self):
        with patch.object(InfluxDbSink, 'init_client') as mock_init_client:
            InfluxDbSink(dict(
                url='http://localhost:8086',
                token='my-token',
                org='my-org',
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(InfluxDbSink, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                InfluxDbSink(dict(
                    url='http://localhost:80863',
                    token='my-token',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'org\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
