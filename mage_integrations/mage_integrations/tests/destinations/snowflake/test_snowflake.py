import unittest

from mage_integrations.destinations.snowflake import Snowflake

SCHEMA = {'properties': {'ID': {'type': ['null', 'string']}},
          'type': 'object',
          }
SCHEMA_NAME = 'test'
STREAM = 'swftest'
TABLE_NAME = 'test_table'
DATABASE_NAME = 'test_db'


def snowflake_config():
    return {
        'lower_case': False,
    }


class SnowflakeDestinationTests(unittest.TestCase):
    def test_create_table_commands(self):
        destination = Snowflake(config=snowflake_config())
        destination.key_properties = {}
        table_commands = destination.build_create_table_commands(SCHEMA,
                                                                 SCHEMA_NAME,
                                                                 STREAM,
                                                                 TABLE_NAME,
                                                                 DATABASE_NAME)
        self.assertEqual(
            table_commands,
            ['CREATE TABLE "test_db"."test"."test_table" ("ID" VARCHAR)']
        )
