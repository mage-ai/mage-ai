import unittest

from mage_integrations.destinations.bigquery import BigQuery

SCHEMA = {'properties': {'ID': {'type': ['null', 'string']}},
          'type': 'object',
          }
SCHEMA_NAME = 'test'
STREAM = 'bgtest'
TABLE_NAME = 'test_table'
DATABASE_NAME = 'test_db'


def bigquery_config():
    return {
        'lower_case': False
    }


class BigQueryDestinationTests(unittest.TestCase):
    def test_create_table_commands(self):
        destination = BigQuery(config=bigquery_config())
        destination.partition_keys = {}
        table_commands = destination.build_create_table_commands(SCHEMA,
                                                                 SCHEMA_NAME,
                                                                 STREAM,
                                                                 TABLE_NAME,
                                                                 DATABASE_NAME)
        self.assertEqual(
            table_commands,
            ['CREATE TABLE test.test_table (`ID` STRING)']
        )
