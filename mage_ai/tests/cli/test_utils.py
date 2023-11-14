import unittest

from mage_ai.cli.utils import get_value, parse_runtime_variables
from mage_ai.tests.base_test import TestCase


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


if __name__ == "__main__":
    unittest.main()
