import unittest

from mage_integrations.destinations.oracledb import OracleDB

SCHEMA = {'properties': {'ID': {'type': ['null', 'string']}},
          'type': 'object',
          }
SCHEMA_NAME = 'test'
STREAM = 'oracletest'
TABLE_NAME = 'test_table'
DATABASE_NAME = 'test_db'


def oracledb_config():
    return {
        'lower_case': False,
    }


class OracleDBDestinationTests(unittest.TestCase):
    def test_create_table_commands(self):
        destination = OracleDB(config=oracledb_config())
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
