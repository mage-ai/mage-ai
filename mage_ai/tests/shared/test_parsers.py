from mage_ai.shared.parsers import sample_output, encode_complex
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

    # ---------------------------------------
    # Tests encode_complex
    # ---------------------------------------

    def test_encode_simple_object_with_dict(self):
        # Simple class with __dict__
        class SimpleObj:
            def __init__(self):
                self.a = 1
                self.b = "hello"

        obj = SimpleObj()
        result = encode_complex(obj)
        self.assertEqual(result, {"a": 1, "b": "hello"})
        self.assertIsInstance(result, dict)

    def test_encode_circular_object_with_dict(self):
        # Object with circular reference
        class CircularObj:
            def __init__(self):
                self.x = 123
                self.y = self  # circular reference

        obj = CircularObj()
        result = encode_complex(obj)
        self.assertEqual(result["x"], 123)
        # The circular reference should fallback to str
        self.assertEqual(result["y"], str(obj))

    def test_encode_nested_object_with_dict(self):
        """
        Test: Object containing another custom object.
        Ensures recursive encoding works inside __dict__.
        """
        class Inner:
            def __init__(self):
                self.v = 9

        class Outer:
            def __init__(self):
                self.inner = Inner()

        obj = Outer()
        result = encode_complex(obj)
        # The inner object should also be turned into a dict
        self.assertEqual(result, {"inner": {"v": 9}})

    def test_encode_object_dict_raises_exception(self):
        """
        __dict__ exists, but accessing attributes raises an exception.
        encode_complex may return the object itself (cannot encode __dict__),
        or str(obj) as a fallback. We accept either.
        """
        class BadObj:
            @property
            def __dict__(self):
                raise RuntimeError("boom")

        obj = BadObj()
        result = encode_complex(obj)
        # Either it returns the object itself (fallback not triggered), or str(obj)
        self.assertTrue(result == obj or result == str(obj))

    def test_encode_class_skips_dict_branch(self):
        """
        Test: Class objects should NOT enter the __dict__ encoding branch.
        encode_complex should treat classes as UUID-serializable objects.
        """
        class MyClass:
            def __init__(self):
                self.a = 1

        result = encode_complex(MyClass)
        # Classes are serialized to UUID strings, not dicts
        self.assertIsInstance(result, str)
        self.assertIn("MyClass", result)

    def test_encode_function_skips_dict_branch(self):
        """
        Test: Functions are explicitly skipped by the __dict__ branch.
        encode_complex should return them untouched.
        """
        def f():
            return 1

        result = encode_complex(f)
        # Functions should be returned as-is
        self.assertIs(result, f)

    def test_encode_deep_circular_reference(self):
        """
        Test: Deep/nested circular reference.
        Ensures encode_complex detects cycles even across multiple objects.
        """
        class Node:
            def __init__(self, name):
                self.name = name
                self.next = None

        a = Node("A")
        b = Node("B")

        # Create circular reference: a -> b -> a
        a.next = b
        b.next = a

        result = encode_complex(a)
        # First level should serialize normally
        self.assertEqual(result["name"], "A")
        self.assertEqual(result["next"]["name"], "B")
        # Second level circular reference should fallback to string
        self.assertEqual(result["next"]["next"], str(a))

        