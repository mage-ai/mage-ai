import os
from unittest.mock import ANY, MagicMock, call, patch

import pandas as pd
from pandas.testing import assert_frame_equal

from mage_ai.streaming.sinks.generic_io import GenericIOSink
from mage_ai.tests.base_test import TestCase

TEST_DATABASES = [
    dict(
        connector_type='bigquery',
        class_name='BigQuery',
        module_path='mage_ai.io.bigquery',
    ),
    dict(
        connector_type='clickhouse',
        class_name='ClickHouse',
        module_path='mage_ai.io.clickhouse',
    ),
    dict(
        connector_type='duckdb',
        class_name='DuckDB',
        module_path='mage_ai.io.duckdb',
    ),
    dict(
        connector_type='mssql',
        class_name='MSSQL',
        module_path='mage_ai.io.mssql',
    ),
    dict(
        connector_type='mysql',
        class_name='MySQL',
        module_path='mage_ai.io.mysql',
    ),
    dict(
        connector_type='redshift',
        class_name='Redshift',
        module_path='mage_ai.io.redshift',
    ),
    dict(
        connector_type='snowflake',
        class_name='Snowflake',
        module_path='mage_ai.io.snowflake',
    ),
    dict(
        connector_type='trino',
        class_name='Trino',
        module_path='mage_ai.io.trino',
    ),
]


class GenericIOTests(TestCase):
    @patch('mage_ai.streaming.sinks.generic_io.ConfigFileLoader')
    @patch('mage_ai.streaming.sinks.generic_io.importlib.import_module')
    def test_init_client(self, mock_import_module, mock_config_loader):
        first_db = True
        for database in TEST_DATABASES:
            mock_objects = self.__mock_objects(mock_import_module, mock_config_loader, database)

            # Assertions
            if first_db:
                mock_config_loader.assert_called_once_with(
                    os.path.join(self.repo_path, 'io_config.yaml'), 'test_profile')
                mock_import_module.assert_called_once_with(database['module_path'])
            mock_objects['io_class'].with_config.assert_called_once_with(
                mock_objects['config_loader_instance'])
            mock_objects['io_client'].open.assert_called_once()

            self.assertEqual(mock_objects['sink'].io_client, mock_objects['io_client'])

            del mock_objects['sink']
            mock_objects['io_client'].close.assert_called_once()
            first_db = False

    @patch('mage_ai.streaming.sinks.generic_io.ConfigFileLoader')
    @patch('mage_ai.streaming.sinks.generic_io.importlib.import_module')
    def test_write(self, mock_import_module, mock_config_loader):
        database = TEST_DATABASES[0]
        mock_objects = self.__mock_objects(mock_import_module, mock_config_loader, database)

        mock_objects['sink'].batch_write = MagicMock()

        message = {'data': {'key': 'value'}}

        # Call the method to be tested
        mock_objects['sink'].write(message)

        # Assertions
        mock_objects['sink'].batch_write.assert_called_once_with([message])

    @patch('mage_ai.streaming.sinks.generic_io.ConfigFileLoader')
    @patch('mage_ai.streaming.sinks.generic_io.importlib.import_module')
    def test_batch_write(self, mock_import_module, mock_config_loader):
        database = TEST_DATABASES[0]
        mock_objects = self.__mock_objects(mock_import_module, mock_config_loader, database)
        mock_objects['io_client'].export = MagicMock()

        # Test data
        messages1 = [{'data': {'key1': 'value1'}}, {'data': {'key2': 'value2'}}]
        messages2 = [{'key': 'value1'}, {'key': 'value2'}]
        messages3 = [
            {'data': {'key1': 'value1'}, 'metadata': {'timestamp': 1000}},
            {'data': {'key2': 'value2'}, 'metadata': {'timestamp': 2000}},
        ]

        # Call the method to be tested
        mock_objects['sink'].batch_write(messages1)
        mock_objects['sink'].batch_write(messages2)
        mock_objects['sink'].batch_write(messages3)

        # Assertions
        export_func = mock_objects['sink'].io_client.export
        export_func.assert_has_calls(
            [
                call(ANY, table_name='test_table', if_exists='append'),
                call(ANY, table_name='test_table', if_exists='append'),
                call(ANY, table_name='test_table', if_exists='append'),
            ],
        )
        calls = export_func.call_args_list
        assert_frame_equal(calls[0][0][0], pd.DataFrame(messages1))
        assert_frame_equal(calls[1][0][0], pd.DataFrame(messages2))
        assert_frame_equal(
            calls[2][0][0],
            pd.DataFrame([
                {'key1': 'value1', 'metadata': {'timestamp': 1000}},
                {'key2': 'value2', 'metadata': {'timestamp': 2000}},
            ]),
        )

    def __mock_objects(self, mock_import_module, mock_config_loader, database):
        mock_io_module = MagicMock()
        mock_io_class = MagicMock()
        mock_io_client = MagicMock()
        mock_import_module.return_value = mock_io_module
        mock_io_class.with_config.return_value = mock_io_client
        mock_config_loader_instance = mock_config_loader.return_value
        setattr(mock_io_module, database['class_name'], mock_io_class)
        generic_io_sink = GenericIOSink(dict(
            connector_type=database['connector_type'],
            profile='test_profile',
            config=dict(
                table_name='test_table',
            )
        ))
        return dict(
            config_loader_instance=mock_config_loader_instance,
            io_module=mock_io_module,
            io_class=mock_io_class,
            io_client=mock_io_client,
            sink=generic_io_sink,
        )
