from unittest.mock import patch

from mage_ai.streaming.sources.influxdb import InfluxDbSource
from mage_ai.tests.base_test import TestCase


class InfluxDbTests(TestCase):
    def test_init(self):
        with patch.object(InfluxDbSource, 'init_client') as mock_init_client:
            InfluxDbSource(
                dict(
                    url='http://localhost:8086',
                    token='my-token',
                    org='my-org',
                )
            )
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(InfluxDbSource, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                InfluxDbSource(
                    dict(
                        url='http://localhost:80863',
                        token='my-token',
                    )
                )
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'org\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
