from unittest.mock import patch

import pandas as pd
import polars as pl
from scipy.sparse import csr_matrix
from sklearn.linear_model import LinearRegression

from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.models.utils import (
    deserialize_complex,
    infer_variable_type,
    serialize_complex,
)
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

    def test_serialize_deserialize_none_values(self):
        """Test that None values in nested structures can be serialized and deserialized."""
        # Test case from the issue
        test_data = [
            {
                'icao24': '018097',
                'firstSeen': 1763414571,
                'estDepartureAirport': None,
                'lastSeen': 1763418065,
                'estArrivalAirport': None,
                'callsign': '5ALEX   ',
                'estDepartureAirportHorizDistance': 0,
                'estDepartureAirportVertDistance': 0,
                'estArrivalAirportHorizDistance': 0,
                'estArrivalAirportVertDistance': 0,
                'departureAirportCandidatesCount': 0,
                'arrivalAirportCandidatesCount': 0,
                'aircraft': None,
                'departure_airport_info': {
                    'status': '404',
                    'error': 'Airport not found.',
                },
                'arrival_airport_info': {
                    'status': '404',
                    'error': 'Airport not found.',
                },
            }
        ]

        # Serialize the data
        serialized_data, column_types = serialize_complex(test_data)

        # Deserialize the data
        deserialized_data = deserialize_complex(serialized_data, column_types)

        # Verify the deserialized data matches the original
        self.assertEqual(len(deserialized_data), 1)
        self.assertEqual(deserialized_data[0]['icao24'], '018097')
        self.assertEqual(deserialized_data[0]['firstSeen'], 1763414571)
        self.assertIsNone(deserialized_data[0]['estDepartureAirport'])
        self.assertIsNone(deserialized_data[0]['estArrivalAirport'])
        self.assertIsNone(deserialized_data[0]['aircraft'])
        self.assertEqual(deserialized_data[0]['departure_airport_info']['status'], '404')

    def test_serialize_deserialize_mixed_none_values(self):
        """Test various scenarios with None values."""
        test_cases = [
            # None in a list
            [1, 2, None, 3, None],
            # None in a dict
            {'a': 1, 'b': None, 'c': 'test'},
            # Nested structures with None
            {'data': [None, {'nested': None, 'value': 42}]},
            # Just None
            None,
        ]

        for test_data in test_cases:
            serialized_data, column_types = serialize_complex(test_data)
            deserialized_data = deserialize_complex(serialized_data, column_types)
            # Note: For the last case (just None), serialize_complex returns (None, {})
            # and deserialize_complex should handle it correctly
            if test_data is None:
                self.assertIsNone(deserialized_data)
            else:
                self.assertEqual(deserialized_data, test_data)
