import unittest

from mage_integrations.destinations.mssql import MSSQL

SCHEMA = {'properties': {'ID': {'type': ['null', 'string']}},
          'type': 'object',
          }
SCHEMA_NAME = 'test'
STREAM = 'mssqltest'
TABLE_NAME = 'test_table'
DATABASE_NAME = 'test_db'


def mssql_config():
    return {
        'lower_case': False,
    }


class MSSQLDestinationTests(unittest.TestCase):
    def test_create_table_commands(self):
        destination = MSSQL(config=mssql_config())
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
