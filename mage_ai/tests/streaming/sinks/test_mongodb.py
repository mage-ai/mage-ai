from mage_ai.streaming.sinks.mongodb import MongoDbSink
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch


class MongoDbTests(TestCase):
    def test_init(self):
        with patch.object(MongoDbSink, 'init_client') as mock_init_client:
            MongoDbSink(dict(
                connection_string='test_connection_string',
                database_name='test_database_name',
                collection_name='test_collection_name',
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(MongoDbSink, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                MongoDbSink(dict(
                    connection_string='test_connection_string',
                    database_name='test_database_name',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'collection_name\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
