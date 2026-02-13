from unittest.mock import patch

import pandas as pd
import polars as pl
from scipy.sparse import csr_matrix
from sklearn.linear_model import LinearRegression

from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.models.utils import cast_column_types, infer_variable_type
from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.tests.base_test import TestCase


class TestModelUtils(TestCase):
    def setUp(self):
        self.repo_path = self.repo_path
        self.pipeline_uuid = 'pipeline_uuid'
        self.block_uuid = 'block_uuid'
        self.variable_uuid = 'variable_uuid'
        self.partition = 'partition'
        self.storage = 'storage'
        self.clean_block_uuid = 'clean_block_uuid'

    def test_polars_dataframe(self):
        data = pl.DataFrame({'a': [1, 2, 3]})
        with patch(
            'mage_ai.data_preparation.models.project.Project.is_feature_enabled',
            lambda _, feature_uuid: FeatureUUID.POLARS == feature_uuid,
        ):
            variable_type_use, basic_iterable = infer_variable_type(data)
            self.assertEqual(variable_type_use, VariableType.POLARS_DATAFRAME)

    def test_pandas_dataframe(self):
        data = pd.DataFrame({'a': [1, 2, 3]})
        variable_type_use, basic_iterable = infer_variable_type(data)
        self.assertEqual(variable_type_use, VariableType.DATAFRAME)

    def test_sparse_matrix(self):
        data = csr_matrix([[0, 0, 1], [1, 0, 0], [0, 1, 0]])
        variable_type_use, basic_iterable = infer_variable_type(data)
        self.assertEqual(variable_type_use, VariableType.MATRIX_SPARSE)

    def test_pandas_series(self):
        data = pd.Series([1, 2, 3])
        variable_type_use, basic_iterable = infer_variable_type(data)
        self.assertEqual(variable_type_use, VariableType.SERIES_PANDAS)

    def test_polars_series(self):
        data = pl.Series([1, 2, 3])
        variable_type_use, basic_iterable = infer_variable_type(data)
        self.assertEqual(variable_type_use, VariableType.SERIES_POLARS)

    def test_sklearn_model(self):
        data = LinearRegression()
        variable_type_use, basic_iterable = infer_variable_type(data)
        self.assertEqual(variable_type_use, VariableType.MODEL_SKLEARN)

    def test_list_complex(self):
        data = [TestCase(), TestCase()]
        variable_type_use, basic_iterable = infer_variable_type(data)
        self.assertEqual(variable_type_use, VariableType.LIST_COMPLEX)

    def test_dictionary_complex(self):
        data = {'a': TestCase(), 'b': TestCase()}
        variable_type_use, basic_iterable = infer_variable_type(data)
        self.assertEqual(variable_type_use, VariableType.DICTIONARY_COMPLEX)

    def test_custom_object(self):
        class CustomObject:
            def __init__(self):
                self.a = 1

        data = CustomObject()
        variable_type_use, basic_iterable = infer_variable_type(data)
        self.assertEqual(variable_type_use, VariableType.CUSTOM_OBJECT)

    def test_iterable(self):
        data = [1, 2, 3]
        variable_type_use, basic_iterable = infer_variable_type(data)
        self.assertEqual(variable_type_use, VariableType.ITERABLE)

    def test_cast_column_types_preserves_object_datetime(self):
        """Columns saved as 'Timestamp' type should be restored to object dtype
        with None instead of NaT after a parquet roundtrip (issue #5913)."""
        # Simulate a DataFrame as it comes back from parquet: datetime64 with NaT
        df = pd.DataFrame({
            'date_col': pd.to_datetime([
                '2025-01-01', '2025-02-15', None, '2025-04-30', None
            ]),
            'other_col': [1, 2, 3, 4, 5],
        })
        self.assertEqual(str(df['date_col'].dtype), 'datetime64[ns]')

        # The column_types dict as saved by __get_column_types for an object
        # column containing Timestamp values
        column_types = {'date_col': 'Timestamp', 'other_col': 'int64'}

        result = cast_column_types(df, column_types)

        # date_col should be restored to object dtype
        self.assertEqual(result['date_col'].dtype, object)
        # Non-null values should still be Timestamps
        self.assertIsInstance(result['date_col'].iloc[0], pd.Timestamp)
        self.assertEqual(result['date_col'].iloc[0], pd.Timestamp('2025-01-01'))
        # NaT values should be restored to None
        self.assertIsNone(result['date_col'].iloc[2])
        self.assertIsNone(result['date_col'].iloc[4])
        # other_col should be unchanged
        self.assertEqual(str(result['other_col'].dtype), 'int64')
