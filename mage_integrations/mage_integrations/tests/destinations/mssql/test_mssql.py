import unittest

from mage_integrations.destinations.mssql import MSSQL
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
STREAM = 'mssqltest'
TABLE_NAME = 'test_table'
DATABASE_NAME = 'test_db'


class MSSQLDestinationTests(unittest.TestCase, SQLDestinationMixin):
    config = {
        'database': 'database',
        'driver': 'driver',
        'host': 'host',
        'password': 'password',
        'username': 'username',
        'lower_case': False,
    }
    conn_class_path = 'mage_integrations.destinations.mssql.MSSQLConnection'
    destination_class = MSSQL
    expected_conn_class_kwargs = dict(
        authentication=None,
        database='database',
        driver='driver',
        host='host',
        password='password',
        port=1433,
        username='username',
    )
    expected_template_config = {
        'config': {
            'authentication': None,
            'database': 'msdb',
            'host': 'localhost',
            'port': '1433',
            'username': 'root',
            'password': 'password',
            'schema': '',
            'table': '',
        },
    }

    def test_create_table_commands(self):
        destination = MSSQL(config=self.config)
        destination.key_properties = {}
        table_commands = destination.build_create_table_commands(SCHEMA,
                                                                 SCHEMA_NAME,
                                                                 STREAM,
                                                                 TABLE_NAME,
                                                                 DATABASE_NAME)
        self.assertEqual(
            table_commands,
            ['CREATE TABLE test.test_table (ID CHAR(255))']
        )
