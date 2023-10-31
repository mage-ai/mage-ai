import unittest

from mage_integrations.destinations.redshift import Redshift
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
STREAM = 'rstest'
TABLE_NAME = 'test_table'
DATABASE_NAME = 'test_db'


class RedshiftDestinationTests(unittest.TestCase, SQLDestinationMixin):
    config = {
        'database': 'database',
        'host': 'host',
        'password': 'password',
        'user': 'user',
        'lower_case': False,
    }
    conn_class_path = 'mage_integrations.destinations.redshift.RedshiftConnection'
    destination_class = Redshift
    expected_conn_class_kwargs = dict(
        access_key_id=None,
        cluster_identifier=None,
        database='database',
        db_user=None,
        host='host',
        password='password',
        port=None,
        region=None,
        secret_access_key=None,
        user='user',
        verbose=1
    )
    expected_template_config = {
        'config': {
            'database': '',
            'host': '',
            'password': '',
            'port': 5439,
            'region': '',
            'schema': '',
            'table': '',
            'user': '',
        },
    }

    def test_create_table_commands(self):
        destination = Redshift(config=self.config)
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
