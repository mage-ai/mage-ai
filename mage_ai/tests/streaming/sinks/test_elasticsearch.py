from unittest.mock import patch

from mage_ai.streaming.sinks.elasticsearch import ElasticSearchSink
from mage_ai.tests.base_test import TestCase


class ElasticSearchTests(TestCase):
    def test_init(self):
        with patch.object(ElasticSearchSink, 'init_client') as mock_init_client:
            ElasticSearchSink(dict(
                host='test_host',
                index_name='test_index_name',
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(ElasticSearchSink, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                ElasticSearchSink(dict(
                    host='test_host',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'index_name\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
