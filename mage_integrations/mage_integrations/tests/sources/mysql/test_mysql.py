from mage_integrations.sources.mysql import MySQL
from unittest.mock import MagicMock, patch
import unittest


def build_sample_mysql_rows():
    return [
        ('demo_users', None, '', 'id', 'varchar(100)', 'YES'),
        ('demo_users', None, '', 'first_name', 'varchar(100)', 'YES'),
        ('demo_users', None, '', 'last_name', 'varchar(100)', 'YES'),
        ('demo_users', None, '', 'age', 'int', 'YES'),
        ('demo_users', None, '', 'color', 'varchar(30)', 'YES'),
    ]


class MySQLSourceTests(unittest.TestCase):
    def test_discover(self):
        source = MySQL(config=dict(database="demo_db"))
        mysql_connection = MagicMock()
        mysql_connection.load.return_value = build_sample_mysql_rows()
        with patch.object(source, 'build_discover_query') as mock_build_query:
            with patch.object(
                source,
                'build_connection',
                return_value=mysql_connection,
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
                                        'id': {'type': ['null', 'string']},
                                        'first_name': {'type': ['null', 'string']},
                                        'last_name': {'type': ['null', 'string']},
                                        'age': {'type': ['null', 'integer']},
                                        'color': {'type': ['null', 'string']},
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
                                ],
                                'auto_add_new_fields': False,
                                'unique_conflict_method': 'UPDATE',
                            }
                        ]
                    },
                )
