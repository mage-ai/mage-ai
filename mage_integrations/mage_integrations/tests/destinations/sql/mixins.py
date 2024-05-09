from unittest.mock import patch

from mage_integrations.tests.destinations.test_base import BaseDestinationTests


class SQLDestinationMixin(BaseDestinationTests):
    config = {}
    conn_class_path = None
    destination_class = None
    expected_conn_class_kwargs = dict()
    expected_template_config = {
        'config': {
            'database': '',
            'host': '',
            'password': '',
            'port': 5432,
            'schema': '',
            'table': '',
            'username': '',
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

    def test_export_batch_data(self):
        if self.destination_class is None:
            return

    def test_test_connection(self):
        if self.destination_class is None:
            return
        with patch(self.conn_class_path) as mock_class:
            sql_conn = mock_class.return_value
            conn = sql_conn.build_connection.return_value
            destination = self.destination_class(config=self.config)
            destination.test_connection()

            mock_class.assert_called_once_with(**self.expected_conn_class_kwargs)
            sql_conn.build_connection.assert_called_once()
            sql_conn.close_connection.assert_called_once_with(conn)
