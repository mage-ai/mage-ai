from mage_integrations.sources.catalog import CatalogEntry
from mage_integrations.sources.sql.base import Source
from unittest.mock import MagicMock, patch
import unittest


def build_sample_rows():
    return [
        ("demo_table", None, None, "actionid", "character varying", "YES"),
        ("demo_table", None, None, "actionname", "character varying", "YES"),
        ("demo_table", None, None, "confidence", "integer", "YES"),
        ("demo_table", None, None, "createddate", "timestamp without time zone", "YES"),
        ("demo_table", None, None, "id", "character varying", "YES"),
        ("demo_table", None, None, "isdeleted", "boolean", "YES"),
        ("demo_table", None, None, "name", "character varying", "YES"),
        ("demo_table", None, None, "type", "character varying", "YES"),
        ("demo_users", None, None, "age", "integer", "YES"),
        ("demo_users", None, None, "color", "character varying", "YES"),
        ("demo_users", None, None, "first_name", "character varying", "YES"),
        ("demo_users", None, None, "id", "character varying", "YES"),
        ("demo_users", None, None, "last_name", "character varying", "YES"),
    ]

def build_log_based_sample_catalog_entry():
    return CatalogEntry(
        replication_method='LOG_BASED',
        stream='demo_users',
        tap_stream_id='demo_users',
    )

class BaseSQLSourceTests(unittest.TestCase):
    def test_discover(self):
        source = Source()
        build_connection = MagicMock()
        with patch.object(source, 'build_discover_query') as mock_build_query:
            with patch.object(
                source,
                'build_connection',
                return_value=build_connection,
            ) as mock_build_connection:
                with patch.object(build_connection, 'load', return_value=build_sample_rows()):
                    catalog = source.discover()
                    mock_build_query.assert_called_once()
                    mock_build_connection.assert_called_once()
                    streams = catalog.streams
                    self.assertEqual(streams[0].tap_stream_id, 'demo_table')
                    self.assertEqual(streams[1].tap_stream_id, 'demo_users')

    def test_count_records_log_based(self):
        source = Source()
        stream = build_log_based_sample_catalog_entry()
        result = source.count_records(stream)
        self.assertEqual(result, 1)

    def test_load_data_log_based(self):
        source = Source()
        stream = build_log_based_sample_catalog_entry()
        with patch.object(source, 'load_data_from_logs', return_value=[]) as mock_load_data_from_logs:
            next(source.load_data(stream), None)
            mock_load_data_from_logs.assert_called_once_with(stream, bookmarks=None, query={})
