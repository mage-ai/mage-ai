from mage_integrations.sources.postgresql import PostgreSQL
from mage_integrations.tests.sources.test_base import build_sample_streams_catalog
from unittest.mock import MagicMock, patch
import unittest


class PostgreSQLSourceTests(unittest.TestCase):
    def test_load_data_from_logs(self):
        source = PostgreSQL(config=dict(replication_slot='mage_test_slot'))
        postgres_connection = MagicMock()
        replication_connection = MagicMock()
        postgres_connection.build_connection.return_value = replication_connection
        postgres_connection.close_connection = MagicMock()

        replication_cursor = MagicMock()
        """
        We need to add the following to avoid AttributeErrors
        when using a mock object with Context Managers.
        """
        replication_cursor.__enter__ = MagicMock(return_value=replication_cursor)
        replication_cursor.__exit__ = MagicMock(return_value=None)
        replication_cursor.start_replication = MagicMock()
        replication_cursor.send_feedback = MagicMock()
        replication_cursor.fetchone.side_effect = [['PostgreSQL 13.9'], ['0/1631B60']]
        replication_connection.cursor.return_value = replication_cursor

        replication_message = MagicMock()
        """"
        The second mocked return value for replication_cursor's "fetchone"
        method results in 23272288 for the end_lsn variable, so we test with
        a value greater than 23272288 to avoid an infinite loop.
        """
        replication_message.data_start = 23272289
        replication_cursor.read_message.return_value = replication_message

        catalog = build_sample_streams_catalog()
        stream = catalog.streams[1]

        with patch.object(
            source,
            'build_connection',
            return_value=postgres_connection,
        ) as mock_build_pg_conn:
            with patch.object(
                source,
                'get_columns',
            ) as mock_get_columns:
                next(source.load_data_from_logs(stream), None)
                mock_build_pg_conn.assert_called_once()
                replication_connection.cursor.assert_called_once()
                replication_cursor.read_message.assert_called_once()
                self.assertEqual(replication_cursor.fetchone.call_count, 2)
                replication_cursor.start_replication.assert_called_once()
                mock_get_columns.assert_called_once()
                replication_cursor.read_message.assert_called_once()
                replication_cursor.send_feedback.assert_not_called()
                postgres_connection.close_connection.assert_called_once_with(replication_connection)
