import unittest

from mage_integrations.destinations.mysql import MySQL
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
STREAM = 'mysqltest'
TABLE_NAME = 'test_table'
DATABASE_NAME = 'test_db'


class MySQLDestinationTests(unittest.TestCase, SQLDestinationMixin):
    config = {
        'database': 'database',
        'host': 'host',
        'password': 'password',
        'username': 'username',
        'lower_case': False,
    }
    conn_class_path = 'mage_integrations.destinations.mysql.MySQLConnection'
    destination_class = MySQL
    expected_conn_class_kwargs = dict(
        database='database',
        host='host',
        password='password',
        port=None,
        username='username',
        connection_method='direct',
        conn_kwargs=None,
        ssh_host=None,
        ssh_port=22,
        ssh_username=None,
        ssh_password=None,
        ssh_pkey=None,
    )
    expected_template_config = {
        'config': {
          'database': '',
          'host': '',
          'password': '',
          'port': 3306,
          'table': '',
          'username': '',
          'use_lowercase': True
        },
    }

    def test_create_table_commands(self):
        destination = MySQL(config=self.config)
        destination.key_properties = {}
        table_commands = destination.build_create_table_commands(SCHEMA,
                                                                 SCHEMA_NAME,
                                                                 STREAM,
                                                                 TABLE_NAME,
                                                                 DATABASE_NAME)
        self.assertEqual(
            table_commands,
            ['CREATE TABLE test_db.test_table (ID CHAR(255))']
        )
