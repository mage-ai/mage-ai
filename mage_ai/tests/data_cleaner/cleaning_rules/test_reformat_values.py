from datetime import datetime as dt
from mage_ai.data_cleaner.cleaning_rules.reformat_values import ReformatValues
from mage_ai.data_cleaner.column_types.column_type_detector import infer_column_types
from mage_ai.tests.base_test import TestCase
import numpy as np
import pandas as pd


class ReformatValuesCleaningRuleTests(TestCase):
    def setUp(self):
        self.rng = np.random.default_rng(42)
        return super().setUp()

    def test_standardized_capitalization(self):
        df = pd.DataFrame(
            [
                [None, 'us', 30000, 'Funny Video Corp', 'cute animal #1', 100, 30],
                ['500', 'CA', 10000, 'Machine Learning 4 U', 'intro to regression', 3000, 20],
                ['', '', np.nan, 'News Inc', 'Daily news #1', None, 75],
                ['250', 'CA', 7500, 'Machine Learning 4 U', 'MACHINE LEARNING SEMINAR', 8000, 20],
                ['1000', 'mx', 45003, None, 'cute Animal #4', 90, 40],
                ['1500', 'MX', 75000, 'Funny Video Corp', '', 70, 25],
                ['1500', np.nan, 75000, 'News Inc', 'daily news #3', 70, 25],
                [None, 'mx', 75000, 'Z Combinator', 'Tutorial: how to Start a startup', 70, np.nan],
                ['1250', 'US', 60000, 'Funny Video Corp', 'cute animal #3', 80, 20],
                ['', 'CA', 5000, '', '', 10000, 30],
                ['800', None, 12050, 'Funny Video Corp', 'meme Compilation', 2000, 45],
                ['600', 'CA', 11000, 'News Inc', 'daily news #2', 3000, 50],
                ['600', 'ca', '', 'Funny Video Corp', '', 3000, None],
                ['700', 'MX', 11750, 'Funny Video Corp', 'cute animal #2', 2750, 55],
                ['700', '', None, 'Funny Video Corp', '', None, 55],
                ['700', 'MX', 11750, 'Funny Video Corp', '', 2750, 55],
                ['1200', 'MX', 52000, 'Z Combinator', 'vc funding strats', 75, 60],
            ],
            columns=[
                'userid',
                'location',
                'number_of_creators',
                'company_name',
                'name',
                'losses',
                'number_of_advertisers',
            ],
        )
        column_types = {
            'userid': 'category_high_cardinality',
            'location': 'category',
            'company_name': 'category_high_cardinality',
            'number_of_creators': 'number',
            'name': 'text',
            'losses': 'number',
            'number_of_advertisers': 'number',
        }
        statistics = {
            'userid/count': 13,
            'userid/null_value_rate': 4 / 17,
            'location/count': 13,
            'location/null_value_rate': 4 / 17,
            'company_name/count': 15,
            'company_name/null_value_rate': 2 / 17,
            'number_of_creators/count': 14,
            'number_of_creators/null_value_rate': 3 / 17,
            'name/count': 12,
            'name/null_value_rate': 5 / 17,
            'losses/count': 16,
            'losses/null_value_rate': 1 / 17,
            'number_of_advertisers/count': 16,
            'number_of_advertisers/null_value_rate': 1 / 17,
        }
        rule = ReformatValues(df, column_types, statistics)
        results = rule.evaluate()
        expected_results = [
            dict(
                title='Reformat values',
                message='Format entries in these columns as fully uppercase to improve data '
                        'quality.',
                action_payload=dict(
                    action_type='reformat',
                    action_arguments=['location'],
                    axis='column',
                    action_options={
                        'reformat': 'caps_standardization',
                        'capitalization': 'uppercase',
                    },
                    action_variables={},
                    action_code='',
                    outputs=[],
                ),
                status='not_applied',
            ),
            dict(
                title='Reformat values',
                message='Format entries in these columns as fully lowercase to improve data '
                        'quality.',
                action_payload=dict(
                    action_type='reformat',
                    action_arguments=['company_name', 'name'],
                    axis='column',
                    action_options={
                        'reformat': 'caps_standardization',
                        'capitalization': 'lowercase',
                    },
                    action_variables={},
                    action_code='',
                    outputs=[],
                ),
                status='not_applied',
            ),
        ]
        self.assertEqual(results, expected_results)

    def test_currency_correction(self):
        df = pd.DataFrame(
            [
                ['$', '$    10000', 'stock exchange america', '$:MAGE', 5.34],
                ['£', '£200', 'huddersfield stock exchange', '£:XYZA', -1.34],
                ['CAD', 'CAD 100', None, '', -0.89],
                ['¥', '¥2500.89', 'stock exchange japan', '', 4.23],
                ['€', '€ 123.34', 'dresden stock exchange', '€:1234', 2.34],
                ['₹', '₹        10000', np.nan, '₹:FDSA', -7.80],
                ['Rs', 'Rs 10000', '', '₹:ASDF', 4.44],
                ['', '10000元', 'stock exchange china', '元:ASDF', 1.02],
                [None, None, 'stock exchange san jose', None, -2.01],
            ],
            columns=[
                'native_currency',
                'value',
                'exchange',
                'ticker',
                'growth_rate',
            ],
        )
        column_types = {
            'native_currency': 'category',
            'value': 'number_with_decimals',
            'exchange': 'category',
            'ticker': 'text',
            'growth_rate': 'number_with_decimals',
        }
        statistics = {
            'native_currency/count': 6,
            'value/count': 8,
            'exchange/count': 6,
            'ticker/count': 6,
            'growth_rate/count': 9,
        }
        rule = ReformatValues(df, column_types, statistics)
        results = rule.evaluate()
        expected_results = [
            dict(
                title='Reformat values',
                message='Format entries in these columns as numbers to improve data quality.',
                action_payload=dict(
                    action_type='reformat',
                    action_arguments=['value'],
                    axis='column',
                    action_options={
                        'reformat': 'currency_to_num',
                    },
                    action_variables={},
                    action_code='',
                    outputs=[],
                ),
                status='not_applied',
            ),
        ]
        self.assertEqual(results, expected_results)

    def test_currency_conversion_test_all_formatting(self):
        values = [
            '  $ 10000',
            '- ¥ 22.324523',
            'Rs 100000.23   ',
            '  € 12.23425',
            'CAD     12423      ',
            '£ .0927503',
            '-₹ 0',
            ' 10000 元   ',
            ' 0.42 €',
            ' -  3.42032 CAD',
        ]

        df = pd.DataFrame({'column': values})
        column_types = {'column': 'number_with_decimals'}
        statistics = {
            'column/count': 10,
            'column/count_distinct': 10,
            'column/null_value_rate': 0,
        }
        results = ReformatValues(df, column_types, statistics).evaluate()
        expected_results = [
            dict(
                title='Reformat values',
                message='Format entries in these columns as numbers to improve data quality.',
                action_payload=dict(
                    action_type='reformat',
                    action_arguments=['column'],
                    axis='column',
                    action_options={
                        'reformat': 'currency_to_num',
                    },
                    action_variables={},
                    action_code='',
                    outputs=[],
                ),
                status='not_applied',
            ),
        ]
        self.assertEqual(results, expected_results)

    def test_datetime_conversion(self):
        df = pd.DataFrame(
            [
                [
                    dt(2022, 8, 4),
                    '08/04/22',
                    'Thursday, August 4, 2022',
                    'Thu, Aug 04 22',
                    '8-4-2022',
                ],
                [dt(2022, 1, 20), '', 'Thursday,   JaNUary 20, 2022', 'THU, Jan 20 22', ''],
                [None, '12/24/22', '', 'Sat, Dec 24 2022', '12-24-2022'],
                [
                    dt(2022, 10, 31),
                    '10/31/22',
                    'Monday,   ocTober 31, 2022',
                    'OctobEr is good',
                    None,
                ],
                [dt(2022, 6, 27), None, 'MonDay, June 27, 2022', 'Mon, jUn 27 2022', '6-27-2022'],
                [dt(2022, 3, 8), '03/08/    22', None, 'tuEsday   is a good day', '3-8-2022'],
            ],
            columns=[
                'date1',
                'date2',
                'date3',
                'date4',
                'date5',
            ],
        )
        # date3 and date4 are detected as text type.
        # TODO: Update column_type_detector to detect date3 and date4 as datetime type.
        column_types = infer_column_types(df)
        statistics = {
            'date1/count': 5,
            'date2/count': 4,
            'date3/count': 4,
            'date4/count': 6,
            'date5/count': 4,
        }
        rule = ReformatValues(df, column_types, statistics)
        results = rule.evaluate()
        expected_results = [
            dict(
                title='Reformat values',
                message='Format entries in these columns as datetime objects to improve data '
                        'quality.',
                action_payload=dict(
                    action_type='reformat',
                    action_arguments=['date2', 'date5'],
                    axis='column',
                    action_options={
                        'reformat': 'date_format_conversion',
                    },
                    action_variables={},
                    action_code='',
                    outputs=[],
                ),
                status='not_applied',
            ),
        ]
        self.assertEqual(results, expected_results)

    def test_datetime_conversion_type_edge_cases(self):
        df = pd.DataFrame(
            [
                [dt(2022, 8, 4), '08/04/22', 'Action Movie #1', 'not a date', 234],
                [dt(2022, 1, 20), '', 'sportsball', '1-20-2022', 13234],
                [None, '12/24/22', 'reality tv show', '12-24-2022', 23234],
                [dt(2022, 10, 31), '10/31/22', '', '10.31.2022', 21432],
                [dt(2022, 6, 27), None, 'action Movie #2', '6/27/2022', 324212],
                [dt(2022, 3, 8), '03/08/    22', 'game show', '3/8/2022', 2034],
            ],
            columns=[
                'date1',
                'date2',
                'notdate',
                'mostlydate',
                'date5',
            ],
        )
        column_types = infer_column_types(df)
        statistics = {
            'date1/count': 5,
            'date2/count': 4,
            'notdate/count': 5,
            'mostlydate/count': 6,
            'date5/count': 6,
            'date1/null_value_rate': 1 / 6,
            'date2/null_value_rate': 2 / 6,
            'notdate/null_value_rate': 1 / 6,
            'mostlydate/null_value_rate': 0 / 6,
            'date5/null_value_rate': 0 / 6,
        }
        rule = ReformatValues(df, column_types, statistics)
        results = rule.evaluate()
        expected_results = [
            dict(
                title='Reformat values',
                message='Format entries in these columns as fully lowercase to improve data '
                        'quality.',
                action_payload=dict(
                    action_type='reformat',
                    action_arguments=['notdate'],
                    axis='column',
                    action_options={
                        'reformat': 'caps_standardization',
                        'capitalization': 'lowercase',
                    },
                    action_variables={},
                    action_code='',
                    outputs=[],
                ),
                status='not_applied',
            ),
            dict(
                title='Reformat values',
                message='Format entries in these columns as datetime objects to improve data '
                        'quality.',
                action_payload=dict(
                    action_type='reformat',
                    action_arguments=['date2', 'mostlydate'],
                    axis='column',
                    action_options={
                        'reformat': 'date_format_conversion',
                    },
                    action_variables={},
                    action_code='',
                    outputs=[],
                ),
                status='not_applied',
            ),
        ]
        self.assertEqual(results, expected_results)
