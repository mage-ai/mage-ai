import unittest

from mage_integrations.destinations.redshift import Redshift

SCHEMA = {'properties': {'ID': {'type': ['null', 'string']}},
          'type': 'object',
          }
SCHEMA_NAME = 'test'
STREAM = 'rstest'
TABLE_NAME = 'test_table'
DATABASE_NAME = 'test_db'


def redshift_config():
    return {
        'lower_case': False,
    }


class RedshiftDestinationTests(unittest.TestCase):
    def test_create_table_commands(self):
        destination = Redshift(config=redshift_config())
        destination.key_properties = {}
        table_commands = destination.build_create_table_commands(SCHEMA,
                                                                 SCHEMA_NAME,
                                                                 STREAM,
                                                                 TABLE_NAME,
                                                                 DATABASE_NAME)
        self.assertEqual(
            table_commands,
            ['CREATE TABLE IF NOT EXISTS test.test_table (ID VARCHAR(255))']
        )
