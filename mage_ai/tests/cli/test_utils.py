import unittest
from unittest.mock import patch, mock_open
from mage_ai.tests.base_test import TestCase
from mage_ai.cli.utils import (
    parse_runtime_variables,
    get_value,
    load_json,
    generate_models_sql,
    generate_dbt_models,
    update_dbt_sources,
)


class TestUtils(TestCase):
    def test_parse_runtime_variables(self):
        # given
        vars_list = ["key1", "val1", "key2", "val2"]

        # when
        result = parse_runtime_variables(vars_list)

        # then
        self.assertEqual(result, {"key1": "val1", "key2": "val2"})

    def test_get_value(self):
        # given
        json_value = '{"key": "value"}'
        str_value = "hello"

        # when
        result_json = get_value(json_value)
        result_str = get_value(str_value)

        # then
        self.assertEqual(result_json, {"key": "value"})
        self.assertEqual(result_str, "hello")

    @patch("builtins.open", new_callable=mock_open, read_data='{"test": "data"}')
    def test_load_json(self, mock_file):
        # when
        result = load_json("path/to/file.json")

        # then
        self.assertEqual(result, {"test": "data"})

    def test_generate_models_sql(self):
        # given
        catalog_data = {
            "catalog": {
                "streams": [
                    {
                        "destination_table": "stream1",
                        "schema": {"properties": {"column1": {}, "column2": {}}},
                    }
                ]
            }
        }

        # when
        result = generate_models_sql(catalog_data, "schema_name")

        # then
        self.assertEqual(
            result,
            [
                (
                    "stream1",
                    "SELECT\n  column1,\n  column2\nFROM {{ source('schema_name', 'stream1') }} \n",
                )
            ],
        )

    @patch("builtins.open", new_callable=mock_open)
    @patch("builtins.print")
    def test_generate_dbt_models(self, mock_print, mock_file):
        # given
        sql_statements = [("stream1", "SELECT * FROM stream1")]

        # when
        generate_dbt_models("/path/to/dir", sql_statements)

        # then
        mock_file.assert_called_with("/path/to/dir/raw_stream1.sql", "w")
        mock_print.assert_called_with("SQL files generated successfully!")

    @patch("builtins.open", new_callable=mock_open, read_data="sources: []")
    @patch("builtins.print")
    def test_update_dbt_sources(self, mock_print, mock_file):
        # given
        catalog_data = {
            "catalog": {
                "streams": [
                    {
                        "destination_table": "stream1",
                        "schema": {"properties": {"column1": {}, "column2": {}}},
                    }
                ]
            }
        }

        # when
        update_dbt_sources(catalog_data, "/path/to/file.yaml", "schema_name")

        # then
        mock_print.assert_called_with("YAML file updated successfully!")


if __name__ == "__main__":
    unittest.main()
