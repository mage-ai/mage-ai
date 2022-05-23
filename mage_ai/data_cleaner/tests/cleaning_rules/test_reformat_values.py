from data_cleaner.cleaning_rules.reformat_values import ReformatValues
from data_cleaner.tests.base_test import TestCase
import numpy as np
import pandas as pd


class ReformatValuesCleaningRule(TestCase):
    def setUp(self):
        self.rng = np.random.default_rng(42)
        return super().setUp()

    def test_standardized_capitalization(self):
        df = pd.DataFrame([
            [None, 'us', 30000, 'Funny Video Corp','cute animal #1', 100, 30],
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
            ['1200', 'MX', 52000, 'Z Combinator', 'vc funding strats', 75, 60]
        ], columns=[
            'userid',
            'location',
            'number_of_creators',
            'company_name',
            'name',
            'losses',
            'number_of_advertisers'
        ])
        column_types = {
            'userid': 'category_high_cardinality',
            'location': 'category',
            'company_name': 'category_high_cardinality',
            'number_of_creators': 'number',
            'name': 'text',
            'losses': 'number',
            'number_of_advertisers': 'number'
        }
        statistics = {
            'userid/count': 13,
            'location/count': 13,
            'company_name/count': 15,
            'number_of_creators/count': 14,
            'name/count': 12,
            'losses/count': 16,
            'number_of_advertisers/count': 16,
        }
        rule = ReformatValues(df, column_types, statistics)
        results = rule.evaluate()
        expected_results = [
            dict(
                title='Reformat values',
                message='The following columns have mixed capitalization formats: '
                        '[\'location\']. '
                        'Reformat these columns with fully uppercase text to improve data quality.',
                action_payload=dict(
                    action_type='reformat',
                    action_arguments=['location'],
                    axis='column',
                    action_options = {
                        'reformat': 'standardize_capitalization',
                        'capitalization': 'uppercase'
                    },
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Reformat values',
                message='The following columns have mixed capitalization formats: '
                        '[\'company_name\', \'name\']. '
                        'Reformat these columns with fully lowercase text to improve data quality.',
                action_payload=dict(
                    action_type='reformat',
                    action_arguments=['company_name', 'name'],
                    axis='column',
                    action_options = {
                        'reformat': 'standardize_capitalization',
                        'capitalization': 'lowercase'
                    },
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            )
        ]
        self.assertEqual(results, expected_results)

    def test_currency_correction(self):
        df = pd.DataFrame([
            ['$', '$    10000', 'stock exchange america', '$:MAGE', 5.34],
            ['£', '£200', 'huddersfield stock exchange', '£:XYZA', -1.34],
            ['CAD', 'CAD 100', None, '', -0.89],
            ['¥', '¥2500.89', 'stock exchange japan', '', 4.23],
            ['€', '€ 123.34', 'dresden stock exchange', '€:1234', 2.34],
            ['₹', '₹        10000', np.nan, '₹:FDSA', -7.80],
            ['Rs', 'Rs 10000', '', '₹:ASDF', 4.44],
            ['', '元10000', 'stock exchange china', '元:ASDF', 1.02],
            [None, '', 'stock exchange san jose', None, -2.01],
        ], columns=[
            'native_currency',
            'value',
            'exchange',
            'ticker',
            'growth_rate',
        ])
        column_types = {
            'native_currency': 'category',
            'value': 'number_with_decimals',
            'exchange': 'category',
            'ticker': 'text',
            'growth_rate': 'number_with_decimals'
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
                message='The following columns have currency type values: '
                        '[\'value\']. '
                        'Reformat these columns as numbers to improve data quality.',
                action_payload=dict(
                    action_type='reformat',
                    action_arguments=['value'],
                    axis='column',
                    action_options = {
                        'reformat': 'currency',
                    },
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
        ]
        self.assertEqual(results, expected_results)
    