import unittest
from unittest.mock import MagicMock, patch

from mage_integrations.sources.catalog import CatalogEntry
from mage_integrations.sources.sql.base import Source
from mage_integrations.tests.sources.test_base import build_sample_streams_catalog


def build_sample_postgres_rows():
    return [
        ('demo_actions', None, None, 'actionid', 'character varying', 'YES'),
        ('demo_actions', None, None, 'actionname', 'character varying', 'YES'),
        ('demo_actions', None, None, 'createddate', 'timestamp without time zone', 'YES'),
        ('demo_actions', None, None, 'type', 'character varying', 'YES'),
        ('demo_users', None, None, 'color', 'character varying', 'YES'),
        ('demo_users', None, None, 'first_name', 'character varying', 'YES'),
        ('demo_users', None, None, 'id', 'character varying', 'YES'),
    ]


def build_log_based_sample_catalog_entry():
    return CatalogEntry(
        replication_method='LOG_BASED',
        stream='demo_users',
        tap_stream_id='demo_users',
    )


class BaseSQLSourceTests(unittest.TestCase):
    maxDiff = None

    def test_discover(self):
        source = Source()
        build_connection_result = MagicMock()
        with patch.object(source, 'build_discover_query') as mock_build_query:
            with patch.object(
                source,
                'build_connection',
                return_value=build_connection_result,
            ) as mock_build_connection:
                with patch.object(
                    build_connection_result,
                    'load',
                    return_value=build_sample_postgres_rows(),
                ):
                    catalog = source.discover()
                    mock_build_query.assert_called_once()
                    mock_build_connection.assert_called_once()
                    self.assertEqual(
                        catalog.to_dict(),
                        {
                            'streams': [
                                {
                                    'tap_stream_id': 'demo_actions',
                                    'replication_method': 'FULL_TABLE',
                                    'key_properties': [],
                                    'schema': {
                                        'properties': {
                                            'actionid': {'type': ['null', 'string']},
                                            'actionname': {'type': ['null', 'string']},
                                            'createddate': {
                                                'format': 'date-time',
                                                'type': ['null', 'string'],
                                            },
                                            'type': {'type': ['null', 'string']},
                                        },
                                        'type': 'object',
                                    },
                                    'stream': 'demo_actions',
                                    'metadata': [
                                        {
                                            'breadcrumb': (),
                                            'metadata': {
                                                'table-key-properties': [],
                                                'forced-replication-method': 'FULL_TABLE',
                                                'valid-replication-keys': [],
                                                'inclusion': 'available',
                                                'schema-name': 'demo_actions',
                                            },
                                        },
                                        {
                                            'breadcrumb': ('properties', 'actionid'),
                                            'metadata': {'inclusion': 'available'},
                                        },
                                        {
                                            'breadcrumb': ('properties', 'actionname'),
                                            'metadata': {'inclusion': 'available'},
                                        },
                                        {
                                            'breadcrumb': ('properties', 'createddate'),
                                            'metadata': {'inclusion': 'available'},
                                        },
                                        {
                                            'breadcrumb': ('properties', 'type'),
                                            'metadata': {'inclusion': 'available'},
                                        },
                                    ],
                                    'auto_add_new_fields': False,
                                    'unique_conflict_method': 'UPDATE',
                                },
                                {
                                    'tap_stream_id': 'demo_users',
                                    'replication_method': 'FULL_TABLE',
                                    'key_properties': [],
                                    'schema': {
                                        'properties': {
                                            'color': {'type': ['null', 'string']},
                                            'first_name': {'type': ['null', 'string']},
                                            'id': {'type': ['null', 'string']},
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
                                            'breadcrumb': ('properties', 'color'),
                                            'metadata': {'inclusion': 'available'},
                                        },
                                        {
                                            'breadcrumb': ('properties', 'first_name'),
                                            'metadata': {'inclusion': 'available'},
                                        },
                                        {
                                            'breadcrumb': ('properties', 'id'),
                                            'metadata': {'inclusion': 'available'},
                                        },
                                    ],
                                    'auto_add_new_fields': False,
                                    'unique_conflict_method': 'UPDATE',
                                },
                            ]
                        },
                    )

    def test_count_records_log_based(self):
        source = Source()
        stream = build_log_based_sample_catalog_entry()
        with patch.object(source, 'build_connection') as mock_build_connection:
            result = source.count_records(stream)
            mock_build_connection.assert_not_called()
            self.assertEqual(result, 1)

    def test_count_records_non_log_based(self):
        source = Source()
        catalog = build_sample_streams_catalog()
        stream = catalog.streams[0]
        build_connection_result = MagicMock()
        with patch.object(
            source,
            'build_connection',
            return_value=build_connection_result,
        ) as mock_build_connection:
            with patch.object(build_connection_result, 'load', return_value=[(1,)]):
                result = source.count_records(stream)
                mock_build_connection.assert_called_once()
                self.assertEqual(result, 1)

    def test_load_data_log_based(self):
        source = Source()
        stream = build_log_based_sample_catalog_entry()
        with patch.object(source, 'load_data_from_logs') as mock_load_data_from_logs:
            next(source.load_data(stream), None)
            mock_load_data_from_logs.assert_called_once_with(stream, bookmarks=None, query={})

    def test_load_data_non_log_based(self):
        source = Source()
        catalog = build_sample_streams_catalog()
        stream = catalog.streams[1]
        build_connection_result = MagicMock()
        with patch.object(source, 'load_data_from_logs') as mock_load_data_from_logs:
            with patch.object(
                source,
                'build_connection',
                return_value=build_connection_result,
            ) as mock_build_connection:
                with patch.object(
                    build_connection_result,
                    'load',
                    return_value=[
                        (18, '2', 'scott', 'jason', 'red'),
                        (17, '3', 'hart', 'kimberly', 'pink'),
                    ],
                ):
                    result = next(source.load_data(stream), None)
                    mock_build_connection.assert_called_once()
                    mock_load_data_from_logs.assert_not_called()
                    self.assertEqual(
                        result,
                        [
                            {
                                'age': 18,
                                'id': '2',
                                'last_name': 'scott',
                                'first_name': 'jason',
                                'color': 'red',
                            },
                            {
                                'age': 17,
                                'id': '3',
                                'last_name': 'hart',
                                'first_name': 'kimberly',
                                'color': 'pink',
                            },
                        ],
                    )
