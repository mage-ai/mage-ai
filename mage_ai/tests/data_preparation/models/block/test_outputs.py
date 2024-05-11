# import json
# import unittest
# from unittest.mock import Mock, patch

# import numpy as np
# import pandas as pd

# from mage_ai.data_preparation.models.block.outputs import format_output_data


# class TestFormatOutputData(unittest.TestCase):
#     def setUp(self):
#         self.block_mock = Mock()
#         self.block_mock.uuid = "block_uuid"
#         self.block_mock.upstream_blocks = []
#         self.block_mock.configuration = {"data_provider": "pandas"}

#     def test_format_output_data_with_pandas_dataframe(self):
#         df = pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"]})

#         # Configure the mock to return a valid value for data_type
#         upstream_block_mock = Mock()
#         upstream_block_mock.data_type.return_value = "dataframe"
#         upstream_block_mock.get_upstream_columns.return_value = [Mock(spec=[]) for _ in range(2)]
#         self.block_mock.upstream_blocks = [upstream_block_mock]

#         formatted_data, is_data_product = format_output_data(
#             self.block_mock, df, "var1"
#         )

#         self.assertTrue(is_data_product)
#         self.assertEqual(formatted_data["type"], "table")

#     def test_format_output_data_with_numpy_array(self):
#         array = np.array([[1, 2, 3], [4, 5, 6]])

#         # Configure the mock to return a valid value for data_type
#         upstream_block_mock = Mock()
#         upstream_block_mock.data_type.return_value = "dataframe"
#         upstream_block_mock.get_upstream_columns.return_value = [Mock(spec=[]) for _ in range(2)]
#         self.block_mock.upstream_blocks = [upstream_block_mock]

#         formatted_data, is_data_product = format_output_data(
#             self.block_mock, array, "var1"
#         )

#         self.assertTrue(is_data_product)
#         self.assertEqual(formatted_data["type"], "table")

#     def test_format_output_data_with_list(self):
#         data = [1, 2, 3]
#         formatted_data, is_data_product = format_output_data(
#             self.block_mock, data, "var1", csv_lines_only=True
#         )

#         self.assertFalse(is_data_product)
#         self.assertEqual(formatted_data["type"], "text")
#         self.assertEqual(formatted_data["text_data"], json.dumps(data))

#     def test_format_output_data_with_dict(self):
#         data = {"key": "value"}
#         formatted_data, is_data_product = format_output_data(
#             self.block_mock, data, "var1"
#         )

#         self.assertFalse(is_data_product)
#         self.assertEqual(formatted_data["type"], "text")
#         self.assertEqual(formatted_data["text_data"], json.dumps(data))

#     @patch("mage_ai.data_preparation.models.block.outputs.encode_complex")
#     def test_format_output_data_with_custom_object(self, mock_encode):
#         data = Mock(spec=[])
#         mock_encode.return_value = "encoded"

#         formatted_data, is_data_product = format_output_data(
#             self.block_mock, data, "var1"
#         )

#         self.assertTrue(is_data_product)
#         self.assertEqual(formatted_data["type"], "text")
#         mock_encode.assert_called_once_with(data)
