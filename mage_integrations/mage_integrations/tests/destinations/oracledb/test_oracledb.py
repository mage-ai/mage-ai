import unittest

from mage_integrations.destinations.oracledb import OracleDB
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
STREAM = 'oracletest'
TABLE_NAME = 'test_table'
DATABASE_NAME = 'test_db'


class OracleDBDestinationTests(unittest.TestCase, SQLDestinationMixin):
    config = {
        'host': 'host',
        'password': 'password',
        'user': 'user',
        'port': 'port',
        'service': 'service',
        'lower_case': False,
        'mode': 'mode',
    }
    conn_class_path = 'mage_integrations.destinations.oracledb.OracleDBConnection'
    destination_class = OracleDB
    expected_conn_class_kwargs = dict(
        host='host',
        password='password',
        user='user',
        port='port',
        service='service',
        mode='mode',
    )
    expected_template_config = {
        'config': {
            'host': '',
            'port': '1521',
            'service': '',
            'password': '',
            'user': '',
            'database': '',
            'mode': 'thin'
        },
    }

    def test_create_table_commands(self):
        destination = OracleDB(config=self.config)
        destination.key_properties = {}
        table_commands = destination.build_create_table_commands(SCHEMA,
                                                                 SCHEMA_NAME,
                                                                 STREAM,
                                                                 TABLE_NAME,
                                                                 DATABASE_NAME)
        self.assertEqual(
            table_commands,
            ['CREATE TABLE test_table (ID CHAR(255))']
        )
