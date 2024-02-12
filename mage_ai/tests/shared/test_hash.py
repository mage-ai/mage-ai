from mage_ai.shared.hash import (
    camel_case_keys_to_snake_case,
    combine_into,
    get_json_value,
    safe_dig,
    set_value,
)
from mage_ai.tests.base_test import TestCase


class HashTests(TestCase):
    def test_camel_case_keys_to_snake_case(self):
        self.assertEqual(
            camel_case_keys_to_snake_case(dict(
                nodeAffinity=dict(
                    requiredDuringSchedulingIgnoredDuringExecution=dict(
                        nodeSelectorTerms=[
                            dict(
                                matchExpressions=[
                                    dict(
                                        key='kubernetes.io/os',
                                        operator='In',
                                        values=['linux']
                                    )
                                ]
                            )
                        ]
                    )
                )
            )),
            dict(
                node_affinity=dict(
                    required_during_scheduling_ignored_during_execution=dict(
                        node_selector_terms=[
                            dict(
                                match_expressions=[
                                    dict(
                                        key='kubernetes.io/os',
                                        operator='In',
                                        values=['linux']
                                    )
                                ]
                            )
                        ]
                    )
                )
            )
        )

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

    def test_combine_into(self):
        parent = dict(
            mage=dict(power=2, level=2),
            fire=dict(
                power=3,
                water=dict(
                    level=3,
                ),
            ),
        )
        child = dict(
            mage=dict(power=1),
            fire=dict(power=2),
            ice=3,
        )
        combine_into(child, parent)

        self.assertEqual(parent, dict(
            mage=dict(power=1, level=2),
            fire=dict(
                power=2,
                water=dict(
                    level=3,
                ),
            ),
            ice=3,
        ))

    def test_safe_dig_dict_navigation(self):
        data = {
            'foo': {
                'bar': {
                    'baz': 42
                }
            }
        }
        self.assertEqual(safe_dig(data, 'foo.bar.baz'), 42)

    def test_safe_dig_list_navigation(self):
        data = {
            'foo': [
                {'bar': 42},
                {'bar': 43}
            ]
        }
        self.assertEqual(safe_dig(data, 'foo[0].bar'), 42)
        self.assertEqual(safe_dig(data, 'foo[1].bar'), 43)
        self.assertEqual(safe_dig(data, ['foo[0]', 'bar']), 42)
        self.assertEqual(safe_dig(data, ['foo[1]', 'bar']), 43)

    def test_safe_dig_missing_key(self):
        data = {
            'foo': {
                'bar': {
                    'baz': 42
                }
            }
        }
        self.assertIsNone(safe_dig(data, 'foo.bar.baz.qux'))
        self.assertIsNone(safe_dig(data, ['foo', 'bar', 'baz', 'qux']))

    def test_safe_dig_none_value(self):
        data = None
        self.assertIsNone(safe_dig(data, 'foo.bar.baz'))
        self.assertIsNone(safe_dig(data, ['foo', 'bar', 'baz']))

    def test_safe_dig_invalid_index(self):
        data = {
            'foo': [1, 2, 3]
        }
        self.assertIsNone(safe_dig(data, 'foo[3]'))
        self.assertIsNone(safe_dig(data, ['foo[3]']))
