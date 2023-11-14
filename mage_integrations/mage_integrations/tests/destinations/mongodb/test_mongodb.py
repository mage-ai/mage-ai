import unittest
from unittest.mock import patch

from mage_integrations.destinations.mongodb import MongoDb
from mage_integrations.tests.destinations.test_base import BaseDestinationTests


class MongoDbDestinationTests(unittest.TestCase, BaseDestinationTests):
    config = {
        'connection_string': 'test_connection_string',
        'db_name': 'test_db',
        'table_name': 'test_table',
    }
    destination_class = MongoDb
    expected_template_config = {
        'config': {
            'connection_string': '',
            'db_name': '',
            'table_name': '',
        }
    }

    def test_templates(self):
        if self.destination_class is None:
            return
        destination = self.destination_class(config=self.config)
        templates = destination.templates()
        self.assertEqual(
            templates,
            self.expected_template_config,
        )

    def test_test_connection(self):
        with patch('pymongo.MongoClient') as mock_client_class:
            mock_client = mock_client_class.return_value
            mock_client.list_database_names.return_value = ['test_db', 'test_db2']

            destination = self.destination_class(config=self.config)
            destination.test_connection()

            mock_client_class.assert_called_once_with(
                'test_connection_string',
                connectTimeoutMS=2000
            )
            mock_client.list_database_names.assert_called_once()
