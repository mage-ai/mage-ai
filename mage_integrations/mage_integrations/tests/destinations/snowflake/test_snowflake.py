import unittest

import pandas as pd
from pandas.testing import assert_frame_equal

from mage_integrations.destinations.snowflake import Snowflake
from mage_integrations.tests.destinations.sql.mixins import SQLDestinationMixin

SCHEMA = {
    'properties': {
        'ID': {
            'type': ['null', 'string'],
        },
        'USER': {
            'type': ['null', 'object'],
        },
    },
    'type': 'object',
}
SCHEMA_NAME = 'test'
STREAM = 'swftest'
TABLE_NAME = 'test_table'
DATABASE_NAME = 'test_db'


class SnowflakeDestinationTests(unittest.TestCase, SQLDestinationMixin):
    config = {
        'account': 'account',
        'database': 'database',
        'password': 'password',
        'schema': 'schema',
        'username': 'username',
        'warehouse': 'warehouse',
        'lower_case': False,
    }
    conn_class_path = 'mage_integrations.destinations.snowflake.SnowflakeConnection'
    destination_class = Snowflake
    expected_conn_class_kwargs = dict(
        account='account',
        database='database',
        password='password',
        schema='schema',
        username='username',
        warehouse='warehouse',
        role=None,
    )
    expected_template_config = {
        'config': {
            'account': '',
            'database': '',
            'disable_double_quotes': False,
            'password': '',
            'role': '',
            'schema': '',
            'table': '',
            'username': '',
            'warehouse': '',
            'use_batch_load': True,
        },
    }

    def test_create_table_commands(self):
        destination = Snowflake(config=self.config)
        destination.key_properties = {}
        table_commands = destination.build_create_table_commands(SCHEMA,
                                                                 SCHEMA_NAME,
                                                                 STREAM,
                                                                 TABLE_NAME,
                                                                 DATABASE_NAME)
        self.assertEqual(
            table_commands,
            ['CREATE TABLE "test_db"."test"."test_table" ("ID" VARCHAR, "_USER" VARIANT)']
        )

    def test_clean_df(self):
        destination = Snowflake(config=self.config)
        destination.schemas = {STREAM: SCHEMA}
        destination.key_properties = {}
        df = pd.DataFrame(
            [
                ['1', {}],
                [2, {'a': {}, 'b': {}}],
                [{'c': 2}, {'a': '1', 'b': '2'}],
            ],
            columns=['ID', 'USER']
        )
        df_clean = destination.clean_df(df, 'swftest')
        df_expected = pd.DataFrame(
            [
                ['1', None],
                ['2', {'a': None, 'b': None}],
                ['{"c": 2}', {'a': '1', 'b': '2'}],
            ],
            columns=['ID', '_USER']
        )
        assert_frame_equal(df_clean, df_expected)
