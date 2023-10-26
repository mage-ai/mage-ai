import unittest

from mage_integrations.destinations.mysql import MySQL

SCHEMA = {'properties': {'ID': {'type': ['null', 'string']}},
          'type': 'object',
          }
SCHEMA_NAME = 'test'
STREAM = 'mysqltest'
TABLE_NAME = 'test_table'
DATABASE_NAME = 'test_db'


def mysql_config():
    return {
        'lower_case': False,
    }


class MySQLDestinationTests(unittest.TestCase):
    def test_create_table_commands(self):
        destination = MySQL(config=mysql_config())
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
