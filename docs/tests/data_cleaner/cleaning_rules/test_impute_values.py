from mage_ai.data_cleaner.cleaning_rules.impute_values import ImputeValues
from mage_ai.data_cleaner.shared.utils import clean_dataframe
from mage_ai.tests.base_test import TestCase
import numpy as np
import pandas as pd


class ImputeValuesTest(TestCase):
    def setUp(self):
        self.rng = np.random.default_rng(42)
        return super().setUp()

    def test_mean(self):
        df = pd.DataFrame(
            [
                [10, 3],
                [None, None],
                [21, None],
                [25, None],
                [None, None],
                [np.NaN, None],
                [31, None],
                [25, 9],
                [21, 99],
                [10, 2],
            ],
            columns=['age', 'number_of_years'],
        )
        column_types = {'age': 'number', 'number_of_years': 'number'}
        statistics = {
            'age/count': 7,
            'age/count_distinct': 4,
            'age/null_value_rate': 3 / 10,
            'number_of_years/count': 4,
            'number_of_years/count_distinct': 4,
            'number_of_years/null_value_rate': 6 / 10,
            'is_timeseries': False,
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='For each column, fill missing entries with the average value.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['age'],
                    action_options=dict(strategy='average'),
                    action_variables=dict(
                        age=dict(feature=dict(column_type='number', uuid='age'), type='feature')
                    ),
                    action_code='',
                    axis='column',
                    outputs=[],
                ),
                status='not_applied',
            ),
            dict(
                title='Fill in missing values',
                message='Fill missing values with a placeholder to mark them as missing.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['number_of_years'],
                    action_options=dict(strategy='constant'),
                    action_variables=dict(
                        number_of_years=dict(
                            feature=dict(column_type='number', uuid='number_of_years'),
                            type='feature',
                        )
                    ),
                    action_code='',
                    axis='column',
                    outputs=[],
                ),
                status='not_applied',
            ),
        ]
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

    def test_mean_large(self):
        age_arr = self.rng.integers(0, 110, size=(150,)).astype(float)
        indices = np.arange(0, 150)
        self.rng.shuffle(indices)
        age_arr[indices[:49]] = np.NaN

        num_years_arr = self.rng.integers(0, 110, size=(150,)).astype(float)
        self.rng.shuffle(indices)
        num_years_arr[indices[:50]] = np.NaN
        df = pd.DataFrame({'age': age_arr, 'number_of_years': num_years_arr})
        column_types = {'age': 'number', 'number_of_years': 'number'}
        statistics = {
            'age/count': df['age'].count(),
            'age/count_distinct': df['age'].nunique(),
            'age/null_value_rate': 1 - df['age'].count() / len(df['age']),
            'number_of_years/count': df['number_of_years'].count(),
            'number_of_years/count_distinct': df['number_of_years'].nunique(),
            'number_of_years/null_value_rate': (
                1 - df['number_of_years'].count() / len(df['number_of_years'])
            ),
            'is_timeseries': False,
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='For each column, fill missing entries with the average value.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['age'],
                    action_options=dict(strategy='average'),
                    action_variables=dict(
                        age=dict(feature=dict(column_type='number', uuid='age'), type='feature')
                    ),
                    action_code='',
                    axis='column',
                    outputs=[],
                ),
                status='not_applied',
            ),
            dict(
                title='Fill in missing values',
                message='Fill missing values with a placeholder to mark them as missing.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['number_of_years'],
                    action_options=dict(strategy='constant'),
                    action_variables=dict(
                        number_of_years=dict(
                            feature=dict(column_type='number', uuid='number_of_years'),
                            type='feature',
                        )
                    ),
                    action_code='',
                    axis='column',
                    outputs=[],
                ),
                status='not_applied',
            ),
        ]
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

    def test_median(self):
        df = pd.DataFrame(
            [
                [90.5, 3],
                [None, None],
                [52.3, None],
                [-2.3, None],
                [None, None],
                [np.NaN, None],
                [-1.4, None],
                [-1.6, 9],
                [-4.3, 9],
                [-3.4, 9],
            ],
            columns=['profit', 'number_of_years'],
        )
        column_types = {'profit': 'number_with_decimals', 'number_of_years': 'number'}
        statistics = {
            'profit/count': 7,
            'profit/count_distinct': 7,
            'profit/null_value_rate': 0.3,
            'number_of_years/count': 2,
            'number_of_years/count_distinct': 2,
            'number_of_years/null_value_rate': 0.6,
            'is_timeseries': False,
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='Fill missing values with a placeholder to mark them as missing.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['number_of_years'],
                    action_options=dict(strategy='constant'),
                    action_variables=dict(
                        number_of_years=dict(
                            feature=dict(column_type='number', uuid='number_of_years'),
                            type='feature',
                        )
                    ),
                    action_code='',
                    axis='column',
                    outputs=[],
                ),
                status='not_applied',
            ),
            dict(
                title='Fill in missing values',
                message='For each column, fill missing entries with the median value.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['profit'],
                    action_options=dict(strategy='median'),
                    action_variables=dict(
                        profit=dict(
                            feature=dict(column_type='number_with_decimals', uuid='profit'),
                            type='feature',
                        )
                    ),
                    action_code='',
                    axis='column',
                    outputs=[],
                ),
                status='not_applied',
            ),
        ]
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

    def test_mode(self):
        df = pd.DataFrame(
            [
                [90.5, 'one', 34934],
                [np.nan, None, np.nan],
                [667, 'one', 10010],
                [np.nan, 'one', 34934],
                [-234, None, np.nan],
                [np.nan, None, 34934],
                [-1.4, 'one', np.nan],
                [-1.6, 'None', 10010],
            ],
            columns=['profit', 'company', 'industry'],
        )
        column_types = {
            'profit': 'number_with_decimals',
            'company': 'category',
            'industry': 'zip_code',
        }
        statistics = {
            'profit/count': 5,
            'profit/null_value_rate': 3 / 8,
            'company/count': 5,
            'company/null_value_rate': 3 / 8,
            'company/mode': 'one',
            'company/mode_ratio': 4 / 5,
            'industry/count': 5,
            'industry/null_value_rate': 3 / 8,
            'industry/mode': 34934,
            'industry/mode_ratio': 3 / 5,
            'is_timeseries': False,
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='Fill missing values with a placeholder to mark them as missing.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['profit'],
                    action_options=dict(strategy='constant'),
                    action_variables=dict(
                        profit=dict(
                            feature=dict(column_type='number_with_decimals', uuid='profit'),
                            type='feature',
                        )
                    ),
                    action_code='',
                    axis='column',
                    outputs=[],
                ),
                status='not_applied',
            ),
            dict(
                title='Fill in missing values',
                message='For each column, fill missing entries with the most frequent value.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['company', 'industry'],
                    action_options=dict(strategy='mode'),
                    action_variables=dict(
                        company=dict(
                            feature=dict(column_type='category', uuid='company'), type='feature'
                        ),
                        industry=dict(
                            feature=dict(column_type='zip_code', uuid='industry'), type='feature'
                        ),
                    ),
                    action_code='',
                    axis='column',
                    outputs=[],
                ),
                status='not_applied',
            ),
        ]
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

    def test_no_numerical(self):
        df = pd.DataFrame(
            [
                [90.5, 3],
                [None, ''],
                ['', None],
                [np.NaN, None],
                [None, None],
                [np.NaN, None],
                [-1.4, None],
                [-1.6, 9],
            ],
            columns=['profit', 'number_of_years'],
        )
        column_types = {'profit': 'number_with_decimals', 'number_of_years': 'number'}
        statistics = {
            'profit/count': 3,
            'profit/count_distinct': 3,
            'profit/null_value_rate': 5 / 8,
            'number_of_years/count': 2,
            'number_of_years/count_distinct': 2,
            'number_of_years/null_value_rate': 6 / 8,
            'is_timeseries': False,
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='Fill missing values with a placeholder to mark them as missing.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['profit', 'number_of_years'],
                    action_options=dict(strategy='constant'),
                    action_variables=dict(
                        profit=dict(
                            feature=dict(column_type='number_with_decimals', uuid='profit'),
                            type='feature',
                        ),
                        number_of_years=dict(
                            feature=dict(column_type='number', uuid='number_of_years'),
                            type='feature',
                        ),
                    ),
                    action_code='',
                    axis='column',
                    outputs=[],
                ),
                status='not_applied',
            ),
        ]
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

    def test_random(self):
        source_ids = np.concatenate(
            [self.rng.integers(10000, 99999, size=(20,)).astype(str) for _ in range(10)]
        )
        source_idxs = self.rng.integers(0, 100, size=(60,))
        source_ids[source_idxs] = ''
        dest_ids = np.concatenate(
            [self.rng.integers(10000, 99999, size=(20,)).astype(str) for _ in range(10)]
        )
        dest_idxs_seq = np.arange(0, 199, 8)
        dest_idxs_rand = self.rng.integers(0, 99, size=(70))
        dest_ids[dest_idxs_seq] = ''
        dest_ids[dest_idxs_rand] = ''
        df = pd.DataFrame({'source': source_ids, 'dest': dest_ids})
        cleaned_df = df.applymap(
            lambda x: x if (not isinstance(x, str) or (len(x) > 0 and not x.isspace())) else np.nan
        )

        column_types = {'source': 'category_high_cardinality', 'dest': 'category_high_cardinality'}
        statistics = {
            'source/count': cleaned_df['source'].count(),
            'source/count_distinct': len(cleaned_df['source'].value_counts().index) - 1,
            'source/null_value_rate': 1 - cleaned_df['source'].count() / len(df),
            'source/mode': cleaned_df['source'].mode(),
            'source/mode_ratio': cleaned_df['source'].value_counts().max()
            / cleaned_df['source'].count(),
            'dest/count': cleaned_df['dest'].count(),
            'dest/count_distinct': len(cleaned_df['dest'].value_counts().index) - 1,
            'dest/null_value_rate': 1 - cleaned_df['dest'].count() / len(df),
            'dest/mode': cleaned_df['dest'].mode(),
            'dest/mode_ratio': cleaned_df['dest'].value_counts().max() / cleaned_df['dest'].count(),
            'is_timeseries': False,
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='Fill missing values with a placeholder to mark them as missing.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['dest'],
                    action_options=dict(strategy='constant'),
                    action_variables=dict(
                        dest=dict(
                            feature=dict(column_type='category_high_cardinality', uuid='dest'),
                            type='feature',
                        ),
                    ),
                    action_code='',
                    axis='column',
                    outputs=[],
                ),
                status='not_applied',
            ),
            dict(
                title='Fill in missing values',
                message='For each column, fill missing entries with randomly sampled values.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['source'],
                    action_options=dict(strategy='random'),
                    action_variables=dict(
                        source=dict(
                            feature=dict(column_type='category_high_cardinality', uuid='source'),
                            type='feature',
                        )
                    ),
                    action_code='',
                    axis='column',
                    outputs=[],
                ),
                status='not_applied',
            ),
        ]
        df = clean_dataframe(df, column_types, dropna=False)
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

    def test_row_rm(self):
        df = pd.DataFrame(
            [
                ['CT', '06902'],
                ['NY', '10001'],
                ['MI', '48841'],
                ['CA', '95001'],
                ['', None],
                [None, '23456'],
                ['CA', None],
                ['MA', '12214'],
                ['PA', '37821'],
                ['TX', '75001'],
            ],
            columns=['state', 'location'],
        )
        column_types = {'state': 'category', 'location': 'zip_code'}
        statistics = {
            'state/count': 8,
            'state/count_distinct': 7,
            'state/null_value_rate': 0.2,
            'location/count': 8,
            'location/count_distinct': 8,
            'location/null_value_rate': 0.2,
            'is_timeseries': False,
        }
        expected_suggestions = [
            dict(
                title='Remove rows with missing entries',
                message='Delete 3 rows to remove all missing values from the dataset.',
                action_payload=dict(
                    action_type='filter',
                    action_arguments=['state', 'location'],
                    action_options={},
                    action_variables=dict(
                        state=dict(
                            feature=dict(column_type='category', uuid='state'), type='feature'
                        ),
                        location=dict(
                            feature=dict(column_type='zip_code', uuid='location'), type='feature'
                        ),
                    ),
                    action_code='state != null and location != null',
                    axis='row',
                    outputs=[],
                ),
                status='not_applied',
            )
        ]
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

    def test_seq(self):
        df = pd.DataFrame(
            [
                ['CT', '06902', '12-24-2022'],
                ['NY', '10001', '12-25-2022'],
                [None, '', None],
                ['CA', '', '12-28-2022'],
                [None, '', '12-30-2022'],
                ['CA', None, '12-30-2022'],
                ['MA', '12214', '12-31-2022'],
                ['PA', '', '1-2-2023'],
                ['TX', '75001', '1-2-2023'],
                ['', None, ''],
            ],
            columns=['state', 'location', 'timestamp'],
        )
        df['lists'] = pd.Series(
            [
                (np.nan, 2.0, 'string', '3'),
                ['not string?', True, True, 8, False, np.nan, None],
                None,
                None,
                None,
                ('not string?', True, True, 8, False, np.nan, None),
                [],
                '[\'not string?\'   ,  True, True , 8   , False  , np.nan, None]',
                '(\'not string?\'   ,  True, True , 8   , False  , np.nan, None)',
                tuple(),
            ]
        )
        column_types = {
            'state': 'category',
            'location': 'zip_code',
            'timestamp': 'datetime',
            'lists': 'list',
        }
        statistics = {
            'state/count': 7,
            'state/count_distinct': 6,
            'state/null_value_rate': 0.4,
            'state/max_null_seq': 1,
            'location/count': 4,
            'location/count_distinct': 4,
            'location/null_value_rate': 0.6,
            'location/max_null_seq': 4,
            'timestamp/null_value_rate': 1 / 10,
            'timestamp/max_null_seq': 1,
            'lists/null_value_rate': 0.3,
            'lists/max_null_seq': 1,
            'lists/mode_ratio': 2 / 10,
            'is_timeseries': True,
            'timeseries_index': ['timestamp'],
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='Fill missing entries using the previously occurring '
                'entry in the timeseries.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['state', 'location', 'timestamp', 'lists'],
                    action_options=dict(strategy='sequential', timeseries_index=['timestamp']),
                    action_variables=dict(
                        state=dict(
                            feature=dict(column_type='category', uuid='state'), type='feature'
                        ),
                        location=dict(
                            feature=dict(column_type='zip_code', uuid='location'), type='feature'
                        ),
                        timestamp=dict(
                            feature=dict(column_type='datetime', uuid='timestamp'), type='feature'
                        ),
                        lists=dict(feature=dict(column_type='list', uuid='lists'), type='feature'),
                    ),
                    action_code='',
                    axis='column',
                    outputs=[],
                ),
                status='not_applied',
            )
        ]
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

    def test_seq_edge(self):
        df = pd.DataFrame(
            [
                ['MI', '32453', '12-26-2022'],
                ['CA', '', '12-28-2022'],
                ['', None, '12-28-2022'],
                ['MA', '12214', '12-31-2022'],
                ['PA', '', '1-2-2023'],
                ['TX', '75001', '1-2-2023'],
                ['CT', '06902', '12-24-2022'],
                ['NY', '10001', '12-25-2022'],
                [None, '', '12-30-2022'],
                ['CA', None, '12-30-2022'],
            ],
            columns=['state', 'location', 'timestamp'],
        )
        df['lists'] = pd.Series(
            [
                (np.nan, 2.0, 'string', '3'),
                ['not string?', True, True, 8, False, np.nan, None],
                None,
                ('not string?', True, True, 8, False, np.nan, None),
                [],
                '[\'not string?\'   ,  True, True , 8   , False  , np.nan, None]',
                None,
                '(\'not string?\'   ,  True, True , 8   , False  , np.nan, None)',
                tuple(),
                None,
            ]
        )
        column_types = {
            'state': 'category',
            'location': 'zip_code',
            'timestamp': 'datetime',
            'lists': 'list',
        }
        statistics = {
            'state/count': 7,
            'state/count_distinct': 6,
            'state/null_value_rate': 0.4,
            'state/max_null_seq': 1,
            'state/mode_ratio': 2 / 7,
            'location/count': 4,
            'location/count_distinct': 4,
            'location/null_value_rate': 0.6,
            'location/max_null_seq': 3,
            'location/mode_ratio': 1 / 4,
            'timestamp/null_value_rate': 0,
            'timestamp/max_null_seq': 0,
            'timestamp/mode_ratio': 1 / 10,
            'lists/null_value_rate': 0.3,
            'lists/max_null_seq': 1,
            'lists/mode_ratio': 2 / 10,
            'is_timeseries': True,
            'timeseries_index': ['timestamp'],
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='Fill missing entries using the previously occurring '
                'entry in the timeseries.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['state', 'location', 'lists'],
                    action_options=dict(strategy='sequential', timeseries_index=['timestamp']),
                    action_variables=dict(
                        state=dict(
                            feature=dict(column_type='category', uuid='state'), type='feature'
                        ),
                        location=dict(
                            feature=dict(column_type='zip_code', uuid='location'), type='feature'
                        ),
                        lists=dict(feature=dict(column_type='list', uuid='lists'), type='feature'),
                    ),
                    action_code='',
                    axis='column',
                    outputs=[],
                ),
                status='not_applied',
            )
        ]
        df = clean_dataframe(df, column_types, dropna=False)
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)
