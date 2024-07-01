from unittest.mock import MagicMock, patch

import pandas as pd

from mage_ai.io.bigquery import BigQuery
from mage_ai.tests.base_test import DBTestCase


class TestTableBigQuery(DBTestCase):

    @patch('google.cloud.bigquery.Client', autospec=True)
    @patch('mage_ai.io.bigquery.BigQuery.__init__', lambda self, **kwargs: None)
    def setUp(self, mock_client):
        super().setUp()
        self.bigquery_instance = BigQuery()
        self.bigquery_instance.client = mock_client.return_value
        self.bigquery_instance.printer = MagicMock()
        self.bigquery_instance.client.create_dataset = MagicMock()
        self.bigquery_instance.client.load_table_from_dataframe = MagicMock()

        self.mock_df = pd.DataFrame({'column1': [1, 2], 'column2': [3, 4]})
        self.dataset = 'test_dataset'
        self.table_id = f"test-project.{self.dataset}.test_table"

    def test_export_creates_dataset_if_flag_is_true(self):
        self.bigquery_instance.export(self.mock_df, self.table_id, create_dataset=True)

        self.bigquery_instance.client.create_dataset.assert_called_once_with(
            dataset=self.dataset, exists_ok=True
        )
        self.bigquery_instance.client.load_table_from_dataframe.assert_called_once()

    def test_export_does_not_create_dataset_if_flag_is_false(self):
        self.bigquery_instance.export(self.mock_df, self.table_id, create_dataset=False)

        self.bigquery_instance.client.create_dataset.assert_not_called()
        self.bigquery_instance.client.load_table_from_dataframe.assert_called_once()

    def test_export_does_not_create_dataset_if_flag_is_not_provided(self):
        self.bigquery_instance.export(self.mock_df, self.table_id)

        self.bigquery_instance.client.create_dataset.assert_called_once_with(
            dataset=self.dataset, exists_ok=True
        )
        self.bigquery_instance.client.load_table_from_dataframe.assert_called_once()

    def test_export_creates_dataset_if_flag_is_true_and_append_with_constraints(self):
        self.bigquery_instance.export(
            self.mock_df,
            self.table_id,
            create_dataset=True,
            if_exists='append',
            unique_constraints=['column1'],
            unique_conflict_method='update',
        )

        self.bigquery_instance.client.create_dataset.assert_called_once_with(
            dataset=self.dataset, exists_ok=True
        )
        self.bigquery_instance.client.load_table_from_dataframe.assert_called_once()

    def test_export_printer_not_called_if_process_fails(self):
        self.bigquery_instance._BigQuery__write_table = MagicMock()
        self.bigquery_instance._BigQuery__write_table.side_effect = RuntimeError("Processing error")

        with self.assertRaises(RuntimeError):
            self.bigquery_instance.export(self.mock_df, self.table_id)

        self.bigquery_instance.client.create_dataset.assert_not_called()
        self.bigquery_instance.client.load_table_from_dataframe.assert_not_called()
