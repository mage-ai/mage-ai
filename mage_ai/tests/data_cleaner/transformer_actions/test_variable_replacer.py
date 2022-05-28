from mage_ai.data_cleaner.transformer_actions.variable_replacer import (
    interpolate,
    replace_true_false,
)
from mage_ai.tests.base_test import TestCase
from mage_ai.tests.data_cleaner.transformer_actions.shared import TEST_ACTION


class VariableReplacerTests(TestCase):
    def test_interpolate(self):
        text = TEST_ACTION['action_code']
        key1 = '1_1'
        variable_data1 = TEST_ACTION['action_variables'][key1]
        key2 = '1_2'
        variable_data2 = TEST_ACTION['action_variables'][key2]
        key3 = '1'
        variable_data3 = TEST_ACTION['action_variables'][key3]

        self.assertEqual(
            interpolate(
                interpolate(interpolate(text, key1, variable_data1), key2, variable_data2),
                key3,
                variable_data3,
            ),
            'omni.deposited == True and (omni.fund == "The Quant" or omni.fund == "Yield")',
        )

    def test_replace_true_false(self):
        action_code = 'a == false and b == true or (a == true and b == false) and ' \
            'a == False and b == True or a == "true" and b == "false" or ' \
            "a == 'false' and b == 'true' or a == 'True' and b == 'False'"
        result = 'a == False and b == True or (a == True and b == False) and ' \
            'a == False and b == True or a == "true" and b == "false" or ' \
            "a == 'false' and b == 'true' or a == 'True' and b == 'False'"
        self.assertEqual(replace_true_false(action_code), result)
