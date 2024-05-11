import os
import shutil
import tempfile
import unittest

from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.shared.outputs import load_custom_object, save_custom_object


class TestSaveAndLoadCustomObject(unittest.TestCase):
    def setUp(self):
        # Create a temporary directory for the tests
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        # Remove the directory after the test
        shutil.rmtree(self.test_dir)

    def test_save_and_load_sklearn_model(self):
        variable_path = os.path.join(self.test_dir, "sklearn_model")
        variable_type = VariableType.MODEL_SKLEARN
        # Assuming a mock or simple sklearn model object is available for the test
        model = object()  # This should be replaced with an actual sklearn model object

        _, full_path = save_custom_object(model, variable_path, variable_type)
        self.assertIsNotNone(full_path)

        loaded_model = load_custom_object(variable_path, variable_type)
        self.assertIsNotNone(loaded_model)
        # Additional assertions to verify model integrity can be added here

    def test_save_and_load_xgboost_model(self):
        variable_path = os.path.join(self.test_dir, "xgboost_model")
        variable_type = VariableType.MODEL_XGBOOST
        # Assuming a mock or simple xgboost model object is available for the test
        model = object()  # This should be replaced with an actual xgboost model object

        _, full_path = save_custom_object(model, variable_path, variable_type)
        self.assertIsNone(full_path)  # Because XGBoost save_model doesn't return a path

        loaded_model = load_custom_object(variable_path, variable_type)
        self.assertIsNotNone(loaded_model)
        # Additional assertions to verify model integrity can be added here

    def test_save_and_load_custom_object(self):
        variable_path = os.path.join(self.test_dir, "custom_object")
        variable_type = VariableType.CUSTOM_OBJECT
        data = {"key": "value"}  # Simple dictionary as an example of a custom object

        _, full_path = save_custom_object(data, variable_path, variable_type)
        self.assertIsNotNone(full_path)

        loaded_data = load_custom_object(variable_path, variable_type)
        self.assertIsNotNone(loaded_data)
        self.assertEqual(data, loaded_data)
