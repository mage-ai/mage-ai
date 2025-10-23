import unittest
from unittest.mock import MagicMock, patch

from mage_integrations.sources.mssql import MSSQL


def build_sample_mssql_rows():
    return [
        ('demo_product', None, 'PRI', 'id', 'int', 'NO'),
        ('demo_product', None, '', 'name', 'varchar(100)', 'NO'),
        ('demo_product', None, '', 'price', 'money', 'NO'),
        ('demo_product', None, '', 'discount', 'decimal', 'YES'),
        ('demo_product', None, '', 'uuid', 'uniqueidentifier', 'NO'),
        ('demo_product', None, '', 'is_active', 'bit', 'NO'),
    ]


class MSSQLSourceTests(unittest.TestCase):
    maxDiff = None

    def test_discover(self):
        source = MSSQL(config=dict(database="demo_db"))
        mysql_connection = MagicMock()
        mysql_connection.load.return_value = build_sample_mssql_rows()
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
                                'tap_stream_id': 'demo_product',
                                'replication_method': 'FULL_TABLE',
                                'key_properties': ['id'],
                                'schema': {
                                    'properties': {
                                        'id': {'type': ['integer']},
                                        'name': {'type': ['string']},
                                        'price': {'type': ['number']},
                                        'discount': {'type': ['null', 'number']},
                                        'uuid': {'type': ['string']},
                                        'is_active': {'type': ['boolean']},
                                    },
                                    'type': 'object',
                                },
                                'stream': 'demo_product',
                                'metadata': [
                                    {
                                        'breadcrumb': (),
                                        'metadata': {
                                            'table-key-properties': ['id'],
                                            'forced-replication-method': 'FULL_TABLE',
                                            'valid-replication-keys': [],
                                            'inclusion': 'available',
                                            'schema-name': 'demo_product',
                                        },
                                    },
                                    {
                                        'breadcrumb': ('properties', 'id'),
                                        'metadata': {'inclusion': 'automatic'},
                                    },
                                    {
                                        'breadcrumb': ('properties', 'name'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                    {
                                        'breadcrumb': ('properties', 'price'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                    {
                                        'breadcrumb': ('properties', 'discount'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                    {
                                        'breadcrumb': ('properties', 'uuid'),
                                        'metadata': {'inclusion': 'available'},
                                    },
                                    {
                                        'breadcrumb': ('properties', 'is_active'),
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
