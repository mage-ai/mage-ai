from mage_ai.streaming.sources.google_cloud_pubsub import GoogleCloudPubSubSource
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch


class GoogleCloudPubSubTests(TestCase):
    def test_init(self):
        with patch.object(GoogleCloudPubSubSource, 'init_client') as mock_init_client:
            GoogleCloudPubSubSource(dict(
                connector_type='test_connector_type',
                project_id='test_project_id',
                topic_id='test_topic_id',
                subscription_id='test_subscription_id',
                timeout=5,
                batch_size=100,
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(GoogleCloudPubSubSource, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                GoogleCloudPubSubSource(dict(
                    connector_type='test_connector_type',
                    project_id='test_project_id',
                    topic_id='test_topic_id',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'subscription_id\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
