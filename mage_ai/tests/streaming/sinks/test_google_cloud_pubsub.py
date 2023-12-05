from unittest.mock import patch

from mage_ai.streaming.sinks.google_cloud_pubsub import GoogleCloudPubSubSink
from mage_ai.tests.base_test import TestCase


class GoogleCloudPubSubTests(TestCase):
    def test_init(self):
        with patch.object(GoogleCloudPubSubSink, 'init_client') as mock_init_client:
            GoogleCloudPubSubSink(dict(
                connector_type='test_google_cloud_pubsub',
                project_id='test_project_id',
                topic_id='test_topic_id',
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(GoogleCloudPubSubSink, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                GoogleCloudPubSubSink(dict(
                    connector_type='test_google_cloud_pubsub',
                    project_id='test_project_id',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'topic_id\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
