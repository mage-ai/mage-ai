import unittest

from mage_integrations.destinations.postgresql import PostgreSQL
from mage_integrations.tests.destinations.sql.mixins import SQLDestinationMixin

SCHEMA = {
    'properties': {
        'ID': {
            'type': ['null', 'string'],
        },
    },
    'type': 'object',
}
SCHEMA_NAME = 'test'
STREAM = 'psqltest'
TABLE_NAME = 'test_table'
DATABASE_NAME = 'test_db'


class PostgreSQLDestinationTests(unittest.TestCase, SQLDestinationMixin):
    config = {
        'database': 'database',
        'host': 'host',
        'password': 'password',
        'username': 'username',
        'lower_case': False,
    }
    conn_class_path = 'mage_integrations.destinations.postgresql.PostgreSQLConnection'
    destination_class = PostgreSQL
    expected_conn_class_kwargs = dict(
        database='database',
        host='host',
        password='password',
        port=None,
        username='username',
    )
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

    def test_create_table_commands(self):
        destination = PostgreSQL(config=self.config)
        destination.key_properties = {}
        table_commands = destination.build_create_table_commands(SCHEMA,
                                                                 SCHEMA_NAME,
                                                                 STREAM,
                                                                 TABLE_NAME,
                                                                 DATABASE_NAME)
        self.assertEqual(
            table_commands,
            ['CREATE TABLE IF NOT EXISTS "test"."test_table" ("ID" TEXT)']
        )
