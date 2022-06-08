from mage_ai.data_cleaner.shared.utils import wrap_column_name
from mage_ai.tests.base_test import TestCase


class SharedTests(TestCase):
    def test_wrap_column_name(self):
        column_names = [
            'good_name',
            'bad name',
            'name_with_symbols!%^&*()-+_=',
            'crazy _)_+(+_a aslfiewawlhi 3452',
            'AnotherGoodName',
            'NowNoGood(at_least_filtering_wise)',
        ]
        expected_names = [
            'good_name',
            '"bad name"',
            '"name_with_symbols!%^&*()-+_="',
            '"crazy _)_+(+_a aslfiewawlhi 3452"',
            'AnotherGoodName',
            '"NowNoGood(at_least_filtering_wise)"',
        ]
        for name, expected_name in zip(column_names, expected_names):
            self.assertEqual(wrap_column_name(name), expected_name)
