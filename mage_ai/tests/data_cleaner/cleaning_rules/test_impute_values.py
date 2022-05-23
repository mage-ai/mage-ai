from data_cleaner.cleaning_rules.impute_values import ImputeValues
from tests.base_test import TestCase
import numpy as np
import pandas as pd


class ImputeValuesTest(TestCase):
    def setUp(self):
        self.rng = np.random.default_rng(42)
        return super().setUp()
    
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
                ['TX', '75001']
            ],
            columns=['state', 'location']
        )
        column_types = {'state': 'category', 'location': 'zip_code'}
        statistics = {
            'state/count': 8,
            'state/count_distinct': 7,
            'state/null_value_rate': 0.2,
            'location/count': 8,
            'location/count_distinct': 8,
            'location/null_value_rate': 0.2,
        }
        expected_suggestions = [
            dict(
                title='Remove rows with missing entries',
                message='The rows at the following indices have null values: [4, 5, 6]. '
                      'Suggested: remove these rows to remove null values from the dataset.',
                action_payload=dict(
                    action_type='filter',
                    action_arguments=['state', 'location'],
                    action_options={},
                    action_variables=dict(
                        state=dict(
                            feature=dict(
                                column_type='category',
                                uuid='state'
                            ),
                            type='feature'
                        ),
                        location=dict(
                            feature=dict(
                                column_type='zip_code',
                                uuid='location'
                            ),
                            type='feature'
                        ),
                    ),
                    action_code='state != null and location != null',
                    axis='row',
                    outputs=[]
                )
            )
        ]
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

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
            columns=['age', 'number_of_years']
        )
        column_types = {'age': 'number', 'number_of_years': 'number'}
        statistics = {
            'age/count': 5,
            'age/count_distinct': 3,
            'age/null_value_rate': 3/8,
            'number_of_years/count': 2,
            'number_of_years/count_distinct': 2,
            'number_of_years/null_value_rate': 6/8,
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='The following columns have null-valued entries and '
                      'the distribution of remaining values is approximately symmetric: '
                      '[\'age\']. '
                      'Suggested: fill null values with the average value from each column.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['age'],
                    action_options=dict(
                        strategy='average'
                    ),
                    action_variables=dict(
                        age=dict(
                            feature=dict(
                                column_type='number',
                                uuid='age'
                            ),
                            type='feature'
                        )
                    ),
                    action_code='',
                    axis='column',
                    outputs=[]
                )
            )
        ]
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

    def test_mean_large(self):
        age_arr = self.rng.integers(0, 110, size=(150,)).astype(float)
        age_arr[self.rng.integers(0, 149, size=(75))] = np.NaN
        num_years_arr = self.rng.integers(0, 110, size=(150,)).astype(float)
        num_years_arr[self.rng.integers(0, 149, size=(76))] = np.NaN
        df = pd.DataFrame(
            {'age':age_arr, 'number_of_years':num_years_arr}
        )
        column_types = {'age': 'number', 'number_of_years': 'number'}
        statistics = {
            'age/count': 75,
            'age/count_distinct': 75,
            'age/null_value_rate': 0.5,
            'number_of_years/count': 74,
            'number_of_years/count_distinct': 74,
            'number_of_years/null_value_rate': 76/150,
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='The following columns have null-valued entries and '
                      'the distribution of remaining values is approximately symmetric: '
                      '[\'age\']. '
                      'Suggested: fill null values with the average value from each column.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['age'],
                    action_options=dict(
                        strategy='average'
                    ),
                    action_variables=dict(
                        age=dict(
                            feature=dict(
                                column_type='number',
                                uuid='age'
                            ),
                            type='feature'
                        )
                    ),
                    action_code='',
                    axis='column',
                    outputs=[]
                )
            )
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
            ],
            columns=['profit', 'number_of_years']
        )
        column_types = {'profit': 'number_with_decimals', 'number_of_years': 'number'}
        statistics = {
            'profit/count': 5,
            'profit/count_distinct': 5,
            'profit/null_value_rate': 3/8,
            'number_of_years/count': 2,
            'number_of_years/count_distinct': 2,
            'number_of_years/null_value_rate': 6/8,
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='The following columns have null-valued entries and '
                      'the distribution of remaining values is skewed: '
                      '[\'profit\']. '
                      'Suggested: fill null values with the median value from each column.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['profit'],
                    action_options=dict(
                        strategy='median'
                    ),
                    action_variables=dict(
                        profit=dict(
                            feature=dict(
                                column_type='number_with_decimals',
                                uuid='profit'
                            ),
                            type='feature'
                        )
                    ),
                    action_code='',
                    axis='column',
                    outputs=[]
                )
            )
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
            columns=['profit', 'number_of_years']
        )
        column_types = {'profit': 'number_with_decimals', 'number_of_years': 'number'}
        statistics = {
            'profit/count': 3,
            'profit/count_distinct': 3,
            'profit/null_value_rate': 5/8,
            'number_of_years/count': 2,
            'number_of_years/count_distinct': 2,
            'number_of_years/null_value_rate': 6/8,
        }
        expected_suggestions = []
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

    def test_seq(self):
        df = pd.DataFrame(
            [
                ['CT', '06902'],
                ['NY', '10001'],
                [None, ''],
                ['CA', ''],
                ['', None],
                [None, ''],
                ['CA', None],
                ['MA', '12214'],
                ['PA', ''],
                ['TX', '75001']
            ],
            columns=['state', 'location']
        )
        column_types = {'state': 'category', 'location': 'zip_code'}
        statistics = {
            'state/count': 7,
            'state/count_distinct': 6,
            'state/null_value_rate': 0.4,
            'location/count': 4,
            'location/count_distinct': 4,
            'location/null_value_rate': 0.6,
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='The following columns have null-valued entries which '
                        'may either be sparsely distributed, or these columns have '
                        'sequential values: [\'state\']. '
                        'Suggested: fill null values with previously occurring value in sequence.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['state'],
                    action_options=dict(
                        strategy='sequential'
                    ),
                    action_variables=dict(
                        state=dict(
                            feature=dict(
                                column_type='category',
                                uuid='state'
                            ),
                            type='feature'
                        )
                    ),
                    action_code='',
                    axis='column',
                    outputs=[]
                )
            )
        ]
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

    def test_seq_datetime(self):
        df = pd.DataFrame(
            [
                ['2022-01-05'],
                [None],
                ['2022-01-16'],
                [None],
                ['2022-02-27'],
                ['2022-03-15'],
                ['2022-03-17'],
                ['2022-03-19'],
                [''],
                ['2022-05-04'],
                [None],
                ['2022-05-11']
            ],
            columns=['date']
        )
        column_types = {'date': 'datetime'}
        statistics = {
            'date/count': 8,
            'date/count_distinct': 8,
            'date/null_value_rate': 2/3,
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='The following columns have null-valued entries which '
                        'may either be sparsely distributed, or these columns have '
                        'sequential values: [\'date\']. '
                        'Suggested: fill null values with previously occurring value in sequence.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['date'],
                    action_options=dict(
                        strategy='sequential'
                    ),
                    action_variables=dict(
                        date=dict(
                            feature=dict(
                                column_type='datetime',
                                uuid='date'
                            ),
                            type='feature'
                        )
                    ),
                    action_code='',
                    axis='column',
                    outputs=[]
                )
            )
        ]
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

    def test_random_small(self):
        source_ids = np.concatenate([np.arange(10000, 10010) for _ in range(6)]).astype(str)
        source_idxs = np.arange(0,30)
        source_ids[source_idxs] = ''
        dest_ids = np.concatenate([np.arange(10000, 10020) for _ in range(3)]).astype(str)
        dest_idxs = np.arange(0,30)
        dest_ids[dest_idxs] = ''
        warehouse_ids = np.concatenate([np.arange(10000, 10010) for _ in range(6)]).astype(str)
        warehouse_idxs = np.arange(0,31)
        warehouse_ids[warehouse_idxs] = ''
        df = pd.DataFrame({
            "source": source_ids,
            "dest": dest_ids,
            "warehouse": warehouse_ids
        })
        cleaned_df = df.applymap(lambda x: x if (not isinstance(x, str) or
                                (len(x) > 0 and not x.isspace())) else np.nan)
        
        column_types = {'source': 'category', 'dest': 'category', 'warehouse': 'category'}
        statistics = {
            'source/count': cleaned_df["source"].count(),
            'source/count_distinct': len(cleaned_df["source"].value_counts().index)-1,
            'source/null_value_rate': 1 - cleaned_df["source"].count()/len(df),
            'dest/count': cleaned_df["dest"].count(),
            'dest/count_distinct': len(cleaned_df["dest"].value_counts().index)-1,
            'dest/null_value_rate': 1 - cleaned_df["dest"].count()/len(df),
            'warehouse/count': cleaned_df["dest"].count(),
            'warehouse/count_distinct': len(cleaned_df["dest"].value_counts().index)-1,
            'warehouse/null_value_rate': 1 - cleaned_df["dest"].count()/len(df),
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='The following columns have null-valued entries and are categorical: '
                      '[\'source\']. '
                      'Suggested: fill null values with a randomly sampled not null value.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['source'],
                    action_options=dict(
                        strategy='random'
                    ),
                    action_variables=dict(
                        source=dict(
                            feature=dict(
                                column_type='category',
                                uuid='source'
                            ),
                            type='feature'
                        )
                    ),
                    action_code='',
                    axis='column',
                    outputs=[]
                )
            )
        ]
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)

    def test_random_large(self):
        source_ids = np.concatenate(
            [self.rng.integers(10000, 99999, size=(20,)).astype(str) for _ in range(10)]
        )
        source_idxs = self.rng.integers(0,100,size=(60,))
        source_ids[source_idxs] = ''
        dest_ids = np.concatenate(
            [self.rng.integers(10000, 99999, size=(20,)).astype(str) for _ in range(10)]
        )
        dest_idxs_seq = np.arange(0, 199, 8)
        dest_idxs_rand = self.rng.integers(0,99,size=(70))
        dest_ids[dest_idxs_seq] = ''
        dest_ids[dest_idxs_rand] = ''
        df = pd.DataFrame({
            "source": source_ids,
            "dest": dest_ids
        })
        cleaned_df = df.applymap(lambda x: x if (not isinstance(x, str) or
                                (len(x) > 0 and not x.isspace())) else np.nan)
        
        column_types = {'source': 'category_high_cardinality', 'dest': 'category_high_cardinality'}
        statistics = {
            'source/count': cleaned_df["source"].count(),
            'source/count_distinct': len(cleaned_df["source"].value_counts().index)-1,
            'source/null_value_rate': 1 - cleaned_df["source"].count()/len(df),
            'dest/count': cleaned_df["dest"].count(),
            'dest/count_distinct': len(cleaned_df["dest"].value_counts().index)-1,
            'dest/null_value_rate': 1 - cleaned_df["dest"].count()/len(df),
        }
        expected_suggestions = [
            dict(
                title='Fill in missing values',
                message='The following columns have null-valued entries and are categorical: '
                      '[\'source\']. '
                      'Suggested: fill null values with a randomly sampled not null value.',
                action_payload=dict(
                    action_type='impute',
                    action_arguments=['source'],
                    action_options=dict(
                        strategy='random'
                    ),
                    action_variables=dict(
                        source=dict(
                            feature=dict(
                                column_type='category_high_cardinality',
                                uuid='source'
                            ),
                            type='feature'
                        )
                    ),
                    action_code='',
                    axis='column',
                    outputs=[]
                )
            )
        ]
        suggestions = ImputeValues(
            df,
            column_types,
            statistics,
        ).evaluate()
        self.assertEqual(expected_suggestions, suggestions)
