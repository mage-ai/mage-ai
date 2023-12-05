import unittest

from mage_integrations.destinations.bigquery import BigQuery
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
STREAM = 'bgtest'
TABLE_NAME = 'test_table'
DATABASE_NAME = 'test_db'


class BigQueryDestinationTests(unittest.TestCase, SQLDestinationMixin):
    config = {
        'path_to_credentials_json_file': 'path_to_credentials_json_file',
        'lower_case': False,
    }
    conn_class_path = 'mage_integrations.destinations.bigquery.BigQueryConnection'
    destination_class = BigQuery
    expected_conn_class_kwargs = dict(
        credentials_info=None,
        path_to_credentials_json_file='path_to_credentials_json_file',
        location=None,
    )
    expected_template_config = {
        'config': {
            'path_to_credentials_json_file': 'path_to_credentials_json_file',
            'project_id': '',
            'dataset': '',
            'location': '',
            'disable_update_column_types': False,
            'use_batch_load': True,
        },
    }

    def test_create_table_commands(self):
        destination = BigQuery(config=self.config)
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
