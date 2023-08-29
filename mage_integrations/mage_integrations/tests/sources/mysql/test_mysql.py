import unittest
from unittest.mock import MagicMock, patch

from mage_integrations.sources.mysql import MySQL


def build_sample_mysql_rows():
    return [
        ('demo_users', None, 'PRI', 'id', 'int', 'NO'),
        ('demo_users', None, '', 'first_name', 'varchar(100)', 'NO'),
        ('demo_users', None, '', 'last_name', 'varchar(100)', 'YES'),
        ('demo_users', '18', '', 'age', 'int', 'YES'),
        (
            'demo_users',
            None,
            '',
            'color',
            "enum('red','green','blue','black','yellow','pink')",
            'YES',
        ),
        ('demo_users', '0', '', 'morphed', 'tinyint(1)', 'NO'),
        ('demo_users', 'CURRENT_TIMESTAMP', '', 'date_joined', 'timestamp', 'NO'),
        ('demo_users', '0', '', 'power_level', 'float', 'YES'),
    ]

class MySQLSourceTests(unittest.TestCase):
    maxDiff = None

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
                                'key_properties': ['id'],
                                'schema': {
                                    'properties': {
                                        'id': {'type': ['integer']},
                                        'first_name': {'type': ['string']},
                                        'last_name': {'type': ['null', 'string']},
                                        'age': {'type': ['null', 'integer']},
                                        'color': {'type': ['null', 'string']},
                                        'morphed': {'type': ['integer']},
                                        'date_joined': {'format': 'date-time', 'type': ['string']},
                                        'power_level': {'type': ['null', 'number']},
                                    },
                                    'type': 'object',
                                },
                                'stream': 'demo_users',
                                'metadata': [
                                    {
                                        'breadcrumb': (),
                                        'metadata': {
                                            'table-key-properties': ['id'],
                                            'forced-replication-method': 'FULL_TABLE',
                                            'valid-replication-keys': [],
                                            'inclusion': 'available',
                                            'schema-name': 'demo_users',
                                        },
                                    },
                                    {
                                        'breadcrumb': ('properties', 'id'),
                                        'metadata': {'inclusion': 'automatic'},
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
                                    {
                                        'breadcrumb': ('properties', 'power_level'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                ],
                                'auto_add_new_fields': False,
                                'unique_conflict_method': 'UPDATE',
                                'unique_constraints': ['id'],
                            }
                        ]
                    },
                )
