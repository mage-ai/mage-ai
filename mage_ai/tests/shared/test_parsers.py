from mage_ai.shared.parsers import sample_output
from mage_ai.tests.base_test import TestCase


class ParsersTests(TestCase):
    def test_sample_output_empty_input(self):
        self.assertEqual(sample_output([]), ([], False))
        self.assertEqual(sample_output({}), ({}, False))

    def test_sample_output_no_sampling(self):
        input_data = [1, 2, 3]
        self.assertEqual(sample_output(input_data), (input_data, False))

        input_data = {'key': 'value', 'nested': {'inner': 'data'}}
        self.assertEqual(sample_output(input_data), (input_data, False))

    def test_sample_output_sampling_list(self):
        # A nested list with more than 20 items, should be sampled
        input_data = [i for i in range(30)]
        expected_output = ([i for i in range(20)], True)
        self.assertEqual(sample_output(input_data), expected_output)

    def test_sample_output_sampling_dict(self):
        input_data = {'key{}'.format(i): i for i in range(30)}
        expected_output = ({'key{}'.format(i): i for i in range(30)}, False)
        self.assertEqual(sample_output(input_data), expected_output)

    def test_sample_output_sampling_mixed(self):
        # A mixed structure with a nested list and dictionary, both exceeding the threshold
        input_data = {'key1': [i for i in range(30)], 'key2': {'inner_key': [i for i in range(30)]}}
        expected_output = (
            {
                'key1': [i for i in range(20)],
                'key2': {'inner_key': [i for i in range(20)]}
            },
            True,
        )
        self.assertEqual(sample_output(input_data), expected_output)

        input_data2 = {
            'key1': [
                {
                    'subkey_1': [i for i in range(30)],
                    'subkey_2': {
                        'subkey_21': {
                            'subkey_211': [i for i in range(30)]
                        }
                    },
                },
                {
                    'subkey_3': [1, 2, 3],
                }
            ]
        }
        expected_output2 = (
            {
                'key1': [
                    {
                        'subkey_1': [i for i in range(20)],
                        'subkey_2': {
                            'subkey_21': {
                                'subkey_211': [i for i in range(20)]
                            },
                        },
                    },
                    {
                        'subkey_3': [1, 2, 3],
                    }
                ]
            },
            True,
        )
        self.assertEqual(sample_output(input_data2), expected_output2)
