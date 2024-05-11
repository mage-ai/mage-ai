import json
import unittest
from unittest.mock import Mock, patch

import numpy as np
import pandas as pd

from mage_ai.data_preparation.models.block.outputs import format_output_data


class TestFormatOutputData(unittest.TestCase):

    def setUp(self):
        # Setup your common test objects and mocks here
        self.block_mock = Mock()
        self.block_mock.uuid = "block_uuid"

    def test_format_output_data_with_pandas_dataframe(self):
        # Example testing with pandas DataFrame
        df = pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"]})
        formatted_data, is_data_product = format_output_data(
            self.block_mock, df, "var1"
        )

        self.assertTrue(is_data_product)
        self.assertEqual(
            formatted_data["type"], "table"
        )  # Assuming 'table' is the expected output type

    def test_format_output_data_with_numpy_array(self):
        # Example testing with Numpy array
        array = np.array([[1, 2, 3], [4, 5, 6]])
        formatted_data, is_data_product = format_output_data(
            self.block_mock, array, "var1"
        )

        self.assertTrue(is_data_product)
        self.assertEqual(
            formatted_data["type"], "table"
        )  # Assuming 'table' is the expected output type

    def test_format_output_data_with_list(self):
        # Example testing with a simple list
        data = [1, 2, 3]
        formatted_data, is_data_product = format_output_data(
            self.block_mock, data, "var1", csv_lines_only=True
        )

        self.assertFalse(is_data_product)
        self.assertEqual(formatted_data["type"], "text")
        self.assertEqual(formatted_data["text_data"], json.dumps(data))

    def test_format_output_data_with_dict(self):
        # Example testing with a dictionary
        data = {"key": "value"}
        formatted_data, is_data_product = format_output_data(
            self.block_mock, data, "var1"
        )

        self.assertFalse(is_data_product)
        self.assertEqual(formatted_data["type"], "text")
        self.assertEqual(formatted_data["text_data"], json.dumps(data))

    @patch("mage_ai.data_preparation.models.block.outputs.encode_complex")
    def test_format_output_data_with_custom_object(self, mock_encode):
        # Mocking `encode_complex` since it's external to what I'm testing
        data = Mock(spec=[])
        mock_encode.return_value = "encoded"

        formatted_data, is_data_product = format_output_data(
            self.block_mock, data, "var1"
        )

        self.assertTrue(is_data_product)
        self.assertEqual(formatted_data["type"], "text")
        mock_encode.assert_called_once_with(data)
