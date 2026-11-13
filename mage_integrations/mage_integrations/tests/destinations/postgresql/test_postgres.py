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
        'truncate_full_table': True,
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
            'truncate_full_table': False,
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

    def test_build_query_strings_truncate_full_table(self):
        destination = PostgreSQL(config=self.config)
        stream = STREAM
        destination.schemas = {stream: SCHEMA}
        destination.unique_constraints = {stream: None}
        destination.replication_methods = {stream: 'FULL_TABLE'}

        with unittest.mock.patch.object(
            destination,
            'does_table_exist',
            return_value=True,
        ):
            with unittest.mock.patch.object(
                destination,
                'build_alter_table_commands',
                return_value=[],
            ):
                queries = destination.build_query_strings(
                    record_data=[],
                    stream=stream,
                    tags={'batch': 0},
                )

        self.assertGreaterEqual(len(queries), 1)
        self.assertTrue(
            any('TRUNCATE TABLE' in q for q in queries),
            msg=f'Expected TRUNCATE TABLE in queries, got: {queries}',
        )
