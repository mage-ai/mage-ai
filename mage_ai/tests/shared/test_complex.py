import unittest

from mage_ai.shared.complex import is_model_sklearn, is_model_xgboost


class TestIsModelSklearn(unittest.TestCase):
    """Tests for the is_model_sklearn function."""

    def test_none_returns_false(self):
        """Test that None input returns False without raising an error."""
        self.assertFalse(is_model_sklearn(None))

    def test_class_returns_false(self):
        """Test that a class (not instance) returns False."""
        self.assertFalse(is_model_sklearn(str))

    def test_string_returns_false(self):
        """Test that a string returns False."""
        self.assertFalse(is_model_sklearn("not a model"))

    def test_dict_returns_false(self):
        """Test that a dict returns False."""
        self.assertFalse(is_model_sklearn({"key": "value"}))

    def test_list_returns_false(self):
        """Test that a list returns False."""
        self.assertFalse(is_model_sklearn([1, 2, 3]))


class TestIsModelXgboost(unittest.TestCase):
    """Tests for the is_model_xgboost function."""

    def test_none_returns_false(self):
        """Test that None input returns False without raising an error."""
        self.assertFalse(is_model_xgboost(None))

    def test_class_returns_false(self):
        """Test that a class (not instance) returns False."""
        self.assertFalse(is_model_xgboost(str))

    def test_string_returns_false(self):
        """Test that a string returns False."""
        self.assertFalse(is_model_xgboost("not a model"))

    def test_dict_returns_false(self):
        """Test that a dict returns False."""
        self.assertFalse(is_model_xgboost({"key": "value"}))

    def test_list_returns_false(self):
        """Test that a list returns False."""
        self.assertFalse(is_model_xgboost([1, 2, 3]))


if __name__ == '__main__':
    unittest.main()
