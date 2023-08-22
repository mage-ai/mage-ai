import unittest
from unittest.mock import MagicMock, patch

from google.cloud.bigquery import Row

from mage_integrations.sources.bigquery import BigQuery


def build_sample_bigquery_rows():
    return [
        Row(
            ('demo_users', 'NULL', None, 'id', 'STRING(100)', 'NO'),
            {
                'table_name': 0,
                'column_default': 1,
                'column_key': 2,
                'column_name': 3,
                'data_type': 4,
                'is_nullable': 5,
            },
        ),
        Row(
            ('demo_users', 'NULL', None, 'first_name', 'STRING(100)', 'YES'),
            {
                'table_name': 0,
                'column_default': 1,
                'column_key': 2,
                'column_name': 3,
                'data_type': 4,
                'is_nullable': 5,
            },
        ),
        Row(
            ('demo_users', 'NULL', None, 'last_name', 'STRING(100)', 'YES'),
            {
                'table_name': 0,
                'column_default': 1,
                'column_key': 2,
                'column_name': 3,
                'data_type': 4,
                'is_nullable': 5,
            },
        ),
        Row(
            ('demo_users', '18', None, 'age', 'INT64', 'YES'),
            {
                'table_name': 0,
                'column_default': 1,
                'column_key': 2,
                'column_name': 3,
                'data_type': 4,
                'is_nullable': 5,
            },
        ),
        Row(
            ('demo_users', 'NULL', None, 'color', 'STRING(30)', 'YES'),
            {
                'table_name': 0,
                'column_default': 1,
                'column_key': 2,
                'column_name': 3,
                'data_type': 4,
                'is_nullable': 5,
            },
        ),
        Row(
            ('demo_users', 'FALSE', None, 'morphed', 'BOOL', 'YES'),
            {
                'table_name': 0,
                'column_default': 1,
                'column_key': 2,
                'column_name': 3,
                'data_type': 4,
                'is_nullable': 5,
            },
        ),
        Row(
            ('demo_users', 'CURRENT_TIMESTAMP()', None, 'date_joined', 'TIMESTAMP', 'YES'),
            {
                'table_name': 0,
                'column_default': 1,
                'column_key': 2,
                'column_name': 3,
                'data_type': 4,
                'is_nullable': 5,
            },
        ),
        Row(
            ('active_users', 'NULL', None, 'user_id', 'STRING', 'NO'),
            {
                'table_name': 0,
                'column_default': 1,
                'column_key': 2,
                'column_name': 3,
                'data_type': 4,
                'is_nullable': 5,
            },
        ),
        Row(
            ('active_users', 'TRUE', None, 'active', 'BOOL', 'YES'),
            {
                'table_name': 0,
                'column_default': 1,
                'column_key': 2,
                'column_name': 3,
                'data_type': 4,
                'is_nullable': 5,
            },
        ),
    ]

class BigQuerySourceTests(unittest.TestCase):
    maxDiff = None

    def test_discover(self):
        source = BigQuery(config=dict(project_id="mage_test_project"))
        bigquery_connection = MagicMock()
        bigquery_connection.load.return_value = build_sample_bigquery_rows()
        with patch.object(source, 'build_discover_query') as mock_build_query:
            with patch.object(
                source,
                'build_connection',
                return_value=bigquery_connection,
            ) as mock_build_connection:
                catalog = source.discover()
                mock_build_query.assert_called_once()
                mock_build_connection.assert_called_once()
                self.assertEqual(
                    catalog.to_dict(),
                    {
                        'streams': [
                            {
                                'tap_stream_id': 'demo_users',
                                'replication_method': 'FULL_TABLE',
                                'key_properties': [],
                                'schema': {
                                    'properties': {
                                        'id': {'type': ['string']},
                                        'first_name': {'type': ['null', 'string']},
                                        'last_name': {'type': ['null', 'string']},
                                        'age': {'type': ['null', 'integer']},
                                        'color': {'type': ['null', 'string']},
                                        'morphed': {'type': ['null', 'boolean']},
                                        'date_joined': {
                                            'format': 'date-time',
                                            'type': ['null', 'string'],
                                        },
                                    },
                                    'type': 'object',
                                },
                                'stream': 'demo_users',
                                'metadata': [
                                    {
                                        'breadcrumb': (),
                                        'metadata': {
                                            'table-key-properties': [],
                                            'forced-replication-method': 'FULL_TABLE',
                                            'valid-replication-keys': [],
                                            'inclusion': 'available',
                                            'schema-name': 'demo_users',
                                        },
                                    },
                                    {
                                        'breadcrumb': ('properties', 'id'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                    {
                                        'breadcrumb': ('properties', 'first_name'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                    {
                                        'breadcrumb': ('properties', 'last_name'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                    {
                                        'breadcrumb': ('properties', 'age'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                    {
                                        'breadcrumb': ('properties', 'color'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                    {
                                        'breadcrumb': ('properties', 'morphed'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                    {
                                        'breadcrumb': ('properties', 'date_joined'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                ],
                                'auto_add_new_fields': False,
                                'unique_conflict_method': 'UPDATE',
                            },
                            {
                                'tap_stream_id': 'active_users',
                                'replication_method': 'FULL_TABLE',
                                'key_properties': [],
                                'schema': {
                                    'properties': {
                                        'user_id': {'type': ['string']},
                                        'active': {'type': ['null', 'boolean']},
                                    },
                                    'type': 'object',
                                },
                                'stream': 'active_users',
                                'metadata': [
                                    {
                                        'breadcrumb': (),
                                        'metadata': {
                                            'table-key-properties': [],
                                            'forced-replication-method': 'FULL_TABLE',
                                            'valid-replication-keys': [],
                                            'inclusion': 'available',
                                            'schema-name': 'active_users',
                                        },
                                    },
                                    {
                                        'breadcrumb': ('properties', 'user_id'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                    {
                                        'breadcrumb': ('properties', 'active'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                ],
                                'auto_add_new_fields': False,
                                'unique_conflict_method': 'UPDATE',
                            },
                        ]
                    },
                )
