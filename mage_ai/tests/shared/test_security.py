from mage_ai.shared.security import filter_out_env_var_values
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch
import os


MOCK_ENV_VARS = {
    'VAR1': '123',
    'VAR2': '45678',
    'VAR3': 'abcdefg',
    'VAR4': '',
}


class SecurityTests(TestCase):
    @patch.dict(os.environ, MOCK_ENV_VARS)
    def test_filter_out_env_var_values(self):
        value1 = filter_out_env_var_values('12345678abcdefghij')
        value2 = filter_out_env_var_values('testdata')
        value3 = filter_out_env_var_values('test45645678')
        self.assertEqual(value1, '123************hij')
        self.assertEqual(value2, 'testdata')
        self.assertEqual(value3, 'test456*****')
