from unittest.mock import patch

from mage_ai.streaming.sinks.postgres import PostgresSink
from mage_ai.tests.base_test import TestCase


class PostgresTests(TestCase):
    def test_init(self):
        with patch.object(PostgresSink, 'init_client') as mock_init_client:
            PostgresSink(dict(
                database='test_db',
                host='test_host',
                password='test_password',
                schema='test_schema',
                table='test_table',
                username='test_username',
                unique_conflict_method='UPDATE',
                unique_constraints=['col1', 'col2'],
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(PostgresSink, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                PostgresSink(dict(
                    database='test_db',
                    host='test_host',
                    password='test_password',
                    schema='test_schema',
                    table='test_table',
                ))
            self.assertTrue(
                '__init__() missing 1 required positional argument: \'username\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
