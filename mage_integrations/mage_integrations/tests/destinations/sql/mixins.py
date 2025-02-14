from unittest.mock import patch

from mage_integrations.tests.destinations.test_base import BaseDestinationTests


class SQLDestinationMixin(BaseDestinationTests):
    config = {}
    config_private_key = {}

    conn_class_path = None
    destination_class = None
    expected_conn_class_kwargs = dict()
    expected_conn_class_kwargs_private_key = dict()

    expected_template_config = {
        'config': {
            'database': '',
            'host': '',
            'passphrase': '',
            'password': '',
            'private_key': '',
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
        auth_configs = [
            (self.config, self.expected_conn_class_kwargs),
            (self.config_private_key,
             self.expected_conn_class_kwargs_private_key),
        ]

        for config, expected_kwargs in auth_configs:
            with self.subTest(config=config):  # Run test for both auth types
                with patch(self.conn_class_path) as mock_class:
                    sql_conn = mock_class.return_value
                    conn = sql_conn.build_connection.return_value
                    destination = self.destination_class(config=config)
                    destination.test_connection()

                    mock_class.assert_called_once_with(**expected_kwargs)
                    sql_conn.build_connection.assert_called_once()
                    sql_conn.close_connection.assert_called_once_with(conn)
