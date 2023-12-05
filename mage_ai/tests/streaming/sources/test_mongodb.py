from unittest.mock import patch

from mage_ai.streaming.sources.mongodb import MongoSource
from mage_ai.tests.base_test import TestCase


class MongoTests(TestCase):

    def test_init(self):
        with patch.object(MongoSource, 'init_client') as mock_init_client:
            MongoSource(dict(
                connector_type='mongo',
                connection_str='mongodb://localhost:27017/',
                database='test_db',
                collection='test_collection',
                batch_size=100,
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(MongoSource, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                MongoSource(dict(
                    connector_type='mongo',
                    database='test_db',
                    batch_size=100,
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'connection_str\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)

    def test_init_no_database(self):
        with patch.object(MongoSource, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                MongoSource(dict(
                    connector_type='mongo',
                    connection_str='mongodb://localhost:27017/',
                    batch_size=100,
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'database\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
