from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.postgresql import PostgreSQL
from unittest.mock import patch
import os
import unittest
import json
import sys

SAMPLE_RECORD = {
    'id': 2,
    'first_name': 'jason',
    'last_name': 'scott',
    'age': 18,
    'color': 'red',
    'morphed': 1,
    'date_joined': '1993-08-28T00:00:00',
    'power_level': 99.99,
}
SAMPLE_ROW = {
    'type': 'RECORD',
    'stream': 'demo_users',
    'record': SAMPLE_RECORD,
}
SAMPLE_SCHEMA = {
    'properties': {
        'id': {'type': ['null', 'string']},
        'first_name': {'type': ['null', 'string']},
        'last_name': {'type': ['null', 'string']},
        'age': {'type': ['null', 'integer']},
        'color': {'type': ['null', 'string']},
        'morphed': {'type': ['integer']},
        'date_joined': {'format': 'date-time', 'type': ['string']},
        'power_level': {'type': ['null', 'number']},
    },
    'type': 'object',
}

class BaseDestinationTests(unittest.TestCase):
    def test_templates(self):
        destination = PostgreSQL()
        templates = destination.templates()
        self.assertEqual(
            templates,
            {
                'config': {
                    'database': '',
                    'host': '',
                    'password': '',
                    'port': 5432,
                    'schema': '',
                    'table': '',
                    'username': '',
                }
            },
        )

    def test_process_record(self):
        destination = Destination(
            config=dict(database='demo_db'),
        )
        destination.disable_column_type_check = dict(demo_users=True)
        with patch.object(destination, 'export_data') as mock_export_data:
            destination.process_record(
                row=SAMPLE_ROW,
                stream='demo_users',
                schema=SAMPLE_SCHEMA,
            )
            mock_export_data.assert_called_once_with(
                record=SAMPLE_RECORD,
                schema=SAMPLE_SCHEMA,
                stream='demo_users',
                tags={},
            )
