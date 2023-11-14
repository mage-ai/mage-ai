import unittest
from unittest.mock import mock_open, patch

from mage_ai.data_preparation.models.block.dbt.utils import (
    generate_dbt_models,
    generate_models_sql,
    load_json,
    update_dbt_sources,
)
from mage_ai.tests.base_test import TestCase


class TestDbtUtils(TestCase):
    @patch('builtins.open', new_callable=mock_open, read_data='{"test": "data"}')
    def test_load_json(self, mock_file):
        # when
        result = load_json('path/to/file.json')

        # then
        self.assertEqual(result, {'test': 'data'})

    def test_generate_models_sql(self):
        # given
        catalog_data = {
            'catalog': {
                'streams': [
                    {
                        'destination_table': 'stream1',
                        'schema': {'properties': {'column1': {}, 'column2': {}}},
                    }
                ]
            }
        }

        # when
        result = generate_models_sql(catalog_data, 'schema_name')

        # then
        self.assertEqual(
            result,
            [
                (
                    'stream1',
                    'SELECT\n  column1,\n  column2\nFROM {{ source("schema_name", "stream1") }} \n',
                )
            ],
        )

    @patch('builtins.open', new_callable=mock_open)
    @patch('builtins.print')
    def test_generate_dbt_models(self, mock_print, mock_file):
        # given
        sql_statements = [('stream1', 'SELECT * FROM stream1')]

        # when
        generate_dbt_models('/path/to/dir', sql_statements)

        # then
        mock_file.assert_called_with('/path/to/dir/raw_stream1.sql', 'w')
        mock_print.assert_called_with('SQL files generated successfully!')

    @patch('builtins.open', new_callable=mock_open, read_data='sources: []')
    @patch('builtins.print')
    def test_update_dbt_sources(self, mock_print, mock_file):
        # given
        catalog_data = {
            'catalog': {
                'streams': [
                    {
                        'destination_table': 'stream1',
                        'schema': {'properties': {'column1': {}, 'column2': {}}},
                    }
                ]
            }
        }

        # when
        update_dbt_sources(catalog_data, '/path/to/file.yaml', 'schema_name')

        # then
        mock_print.assert_called_with('YAML file updated successfully!')


if __name__ == '__main__':
    unittest.main()
