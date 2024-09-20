from unittest.mock import patch

from mage_ai.streaming.sources.mqtt import MQTTSource
from mage_ai.tests.base_test import TestCase


class MQTTTests(TestCase):
    def test_init(self):
        with patch.object(MQTTSource, 'init_client') as mock_init_client:
            MQTTSource(
                dict(
                    connector_type='mqtt',
                    host='127.0.0.1',
                    topic='test_topic',
                    port=1883,
                )
            )
            mock_init_client.assert_called_once()
