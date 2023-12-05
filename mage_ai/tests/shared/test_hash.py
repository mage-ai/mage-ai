from mage_ai.shared.hash import get_json_value, set_value
from mage_ai.tests.base_test import TestCase


class HashTests(TestCase):
    def test_get_json_value(self):
        self.assertEqual(
            get_json_value('{"k1": "v1", "k2": "v2"}', 'k1'),
            'v1'
        )
        self.assertEqual(
            get_json_value('test_str', 'k1'),
            'test_str'
        )
        self.assertEqual(
            get_json_value('{"k1": "v1", "k2": ["v21", "v22"]}', 'k2[0]'),
            'v21'
        )
        self.assertEqual(
            get_json_value('{"k1": "v1", "k2": {"k21": "v21", "k22": "v22"} }', 'k2.k22'),
            'v22'
        )

    def test_get_value(self):
        obj = dict(l1=dict(power=1))
        value = 'mage'

        self.assertEqual(
            set_value(obj, ['l1', 'l2', 'l3'], value),
            dict(
                l1=dict(
                    l2=dict(
                        l3=value,
                    ),
                    power=1,
                ),
            ),
        )
