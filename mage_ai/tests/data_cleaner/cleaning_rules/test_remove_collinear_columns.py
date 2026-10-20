from mage_ai.data_cleaner.cleaning_rules.remove_collinear_columns import RemoveCollinearColumns
from mage_ai.data_cleaner.shared.utils import clean_dataframe
from mage_ai.tests.base_test import TestCase
from pandas.testing import assert_frame_equal
import numpy as np
import pandas as pd


class RemoveCollinearColumnsTests(TestCase):
    def setUp(self):
        self.rng = np.random.default_rng(42)
        return super().setUp()

    def test_categorical_data_frame(self):
        df = pd.DataFrame(
            [
                [1, 1000, '2021-10-01', '2021-09-01'],
                [1, 1050, '2021-10-01', '2021-08-01'],
                [1, 1100, '2021-10-01', '2021-01-01'],
                [2, 1150, '2021-09-01', '2021-08-01'],
            ],
            columns=[
                'group_id',
                'order_id',
                'group_churned_at',
                'order_created_at',
            ],
        )
        column_types = {
            'group_id': 'category',
            'order_id': 'category',
            'group_churned_at': 'datetime',
            'order_created_at': 'datetime',
        }
        statistics = {}
        df = clean_dataframe(df, column_types, dropna=False)
        result = RemoveCollinearColumns(df, column_types, statistics).evaluate()
        self.assertEqual(result, [])

    def test_clean_removes_all_data_frame(self):
        df = pd.DataFrame(
            [
                [None, 1000, '2021-10-01', '2021-09-01'],
                [1, None, '2021-10-01', '2021-08-01'],
                [np.nan, 1100, '2021-10-01', '2021-01-01'],
                [None, 1150, '2021-09-01', '2021-08-01'],
            ],
            columns=[
                'group_id',
                'order_id',
                'group_churned_at',
                'order_created_at',
            ],
        )
        column_types = {
            'group_id': 'number',
            'order_id': 'number',
            'group_churned_at': 'datetime',
            'order_created_at': 'datetime',
        }
        statistics = {}
        df = clean_dataframe(df, column_types, dropna=False)
        result = RemoveCollinearColumns(df, column_types, statistics).evaluate()
        self.assertEqual(result, [])

    def test_evaluate(self):
        df = pd.DataFrame(
            [
                [1000, 30000, 10, 100, 30],
                [500, 10000, 20, 3000, 20],
                [250, 7500, 25, 8000, 20],
                [1000, 45003, 20, 90, 40],
                [1500, 75000, 30, 70, 25],
                [1250, 60000, 50, 80, 20],
                [200, 5000, 30, 10000, 30],
                [800, 12050, 40, 2000, 45],
                [600, 11000, 50, 3000, 50],
                [700, 11750, 20, 2750, 55],
                [1200, 52000, 10, 75, 60],
            ],
            columns=[
                'number_of_users',
                'views',
                'number_of_creators',
                'losses',
                'number_of_advertisers',
            ],
        )
        column_types = {
            'number_of_users': 'number',
            'views': 'number',
            'number_of_creators': 'number',
            'losses': 'number',
            'number_of_advertisers': 'number',
        }
        statistics = {}
        df = clean_dataframe(df, column_types, dropna=False)
        rule = RemoveCollinearColumns(df, column_types, statistics)
        results = rule.evaluate()
        expected_results = [
            dict(
                title='Remove collinear columns',
                message='Delete these columns to remove redundant data and increase data quality.',
                status='not_applied',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['number_of_users'],
                    axis='column',
                    action_options={},
                    action_variables={},
                    action_code='',
                    outputs=[],
                ),
            )
        ]
        self.assertEqual(results, expected_results)

    def test_evaluate_bad_dtypes(self):
        df = pd.DataFrame(
            [
                [1000, 'US', 30000, '10', 'cute animal #1', 100, '30'],
                ['500', 'CA', 10000, '20', 'intro to regression', 3000, '20'],
                [200, '', np.nan, '50', 'daily news #1', None, '75'],
                [250, 'CA', 7500, '25', 'machine learning seminar', 8000, '20'],
                ['1000', 'MX', 45003, '20', 'cute animal #4', 90, '40'],
                [1500, 'MX', 75000, '30', '', 70, '25'],
                [1500, 'US', 75000, np.nan, 'daily news #3', 70, '25'],
                [None, 'US', 75000, '30', 'tutorial: how to start a startup', 70, np.nan],
                [1250, 'US', 60000, '50', 'cute animal #3', 80, '20'],
                ['200', 'CA', 5000, '30', '', 10000, '30'],
                [800, 'US', 12050, '40', 'meme compilation', 2000, '45'],
                ['600', 'CA', 11000, '50', 'daily news #2', 3000, '50'],
                [600, 'CA', '', 50, '', 3000, None],
                ['700', 'MX', 11750, '20', 'cute animal #2', 2750, '55'],
                [700, '', None, 20, '', None, '55'],
                [700, 'MX', 11750, '', '', 2750, '55'],
                [1200, 'MX', 52000, '10', 'vc funding strats', 75, '60'],
            ],
            columns=[
                'number_of_users',
                'location',
                'views',
                'number_of_creators',
                'name',
                'losses',
                'number_of_advertisers',
            ],
        )
        cleaned_df = pd.DataFrame(
            [
                [1000, 30000, 10, 100, 30],
                [500, 10000, 20, 3000, 20],
                [250, 7500, 25, 8000, 20],
                [1000, 45003, 20, 90, 40],
                [1500, 75000, 30, 70, 25],
                [1250, 60000, 50, 80, 20],
                [200, 5000, 30, 10000, 30],
                [800, 12050, 40, 2000, 45],
                [600, 11000, 50, 3000, 50],
                [700, 11750, 20, 2750, 55],
                [1200, 52000, 10, 75, 60],
            ],
            columns=[
                'number_of_users',
                'views',
                'number_of_creators',
                'losses',
                'number_of_advertisers',
            ],
        ).astype(float)
        column_types = {
            'number_of_users': 'number',
            'location': 'category',
            'views': 'number',
            'number_of_creators': 'number',
            'name': 'text',
            'losses': 'number',
            'number_of_advertisers': 'number',
        }
        statistics = {}
        df = clean_dataframe(df, column_types)
        rule = RemoveCollinearColumns(df, column_types, statistics)
        assert_frame_equal(cleaned_df, rule.numeric_df.reset_index(drop=True))
        results = rule.evaluate()
        expected_results = [
            dict(
                title='Remove collinear columns',
                message='Delete these columns to remove redundant data and increase data quality.',
                status='not_applied',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['number_of_users'],
                    axis='column',
                    action_options={},
                    action_variables={},
                    action_code='',
                    outputs=[],
                ),
            )
        ]
        self.assertEqual(results, expected_results)

    def test_evaluate_dirty(self):
        df = pd.DataFrame(
            [
                [1000, 30000, 10, 100, 30],
                [500, 10000, 20, 3000, 20],
                [200, np.nan, 50, None, 75],
                [250, 7500, 25, 8000, 20],
                [1000, 45003, 20, 90, 40],
                [1500, 75000, 30, 70, 25],
                [1500, 75000, np.nan, 70, 25],
                [None, 75000, 30, 70, np.nan],
                [1250, 60000, 50, 80, 20],
                [200, 5000, 30, 10000, 30],
                [800, 12050, 40, 2000, 45],
                [600, 11000, 50, 3000, 50],
                [600, '', 50, 3000, None],
                [700, 11750, 20, 2750, 55],
                [700, None, 20, None, 55],
                [700, 11750, '', 2750, 55],
                [1200, 52000, 10, 75, 60],
            ],
            columns=[
                'number_of_users',
                'views',
                'number_of_creators',
                'losses',
                'number_of_advertisers',
            ],
        )
        cleaned_df = pd.DataFrame(
            [
                [1000, 30000, 10, 100, 30],
                [500, 10000, 20, 3000, 20],
                [250, 7500, 25, 8000, 20],
                [1000, 45003, 20, 90, 40],
                [1500, 75000, 30, 70, 25],
                [1250, 60000, 50, 80, 20],
                [200, 5000, 30, 10000, 30],
                [800, 12050, 40, 2000, 45],
                [600, 11000, 50, 3000, 50],
                [700, 11750, 20, 2750, 55],
                [1200, 52000, 10, 75, 60],
            ],
            columns=[
                'number_of_users',
                'views',
                'number_of_creators',
                'losses',
                'number_of_advertisers',
            ],
        ).astype(float)
        column_types = {
            'number_of_users': 'number',
            'views': 'number',
            'number_of_creators': 'number',
            'losses': 'number',
            'number_of_advertisers': 'number',
        }
        statistics = {}
        df = clean_dataframe(df, column_types, dropna=False)
        rule = RemoveCollinearColumns(df, column_types, statistics)
        assert_frame_equal(cleaned_df, rule.numeric_df.reset_index(drop=True))
        results = rule.evaluate()
        expected_results = [
            dict(
                title='Remove collinear columns',
                message='Delete these columns to remove redundant data and increase data quality.',
                status='not_applied',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['number_of_users'],
                    axis='column',
                    action_options={},
                    action_variables={},
                    action_code='',
                    outputs=[],
                ),
            )
        ]
        self.assertEqual(results, expected_results)

    def test_evaluate_non_numeric(self):
        df = pd.DataFrame(
            [
                [1000, 'US', 30000, 10, 'cute animal #1', 100, 30],
                [500, 'CA', 10000, 20, 'intro to regression', 3000, 20],
                [200, '', np.nan, 50, 'daily news #1', None, 75],
                [250, 'CA', 7500, 25, 'machine learning seminar', 8000, 20],
                [1000, 'MX', 45003, 20, 'cute animal #4', 90, 40],
                [1500, 'MX', 75000, 30, '', 70, 25],
                [1500, 'US', 75000, np.nan, 'daily news #3', 70, 25],
                [None, 'US', 75000, 30, 'tutorial: how to start a startup', 70, np.nan],
                [1250, 'US', 60000, 50, 'cute animal #3', 80, 20],
                [200, 'CA', 5000, 30, '', 10000, 30],
                [800, 'US', 12050, 40, 'meme compilation', 2000, 45],
                [600, 'CA', 11000, 50, 'daily news #2', 3000, 50],
                [600, 'CA', '', 50, '', 3000, None],
                [700, 'MX', 11750, 20, 'cute animal #2', 2750, 55],
                [700, '', None, 20, '', None, 55],
                [700, 'MX', 11750, '', '', 2750, 55],
                [1200, 'MX', 52000, 10, 'vc funding strats', 75, 60],
            ],
            columns=[
                'number_of_users',
                'location',
                'views',
                'number_of_creators',
                'name',
                'losses',
                'number_of_advertisers',
            ],
        )
        cleaned_df = pd.DataFrame(
            [
                [1000, 30000, 10, 100, 30],
                [500, 10000, 20, 3000, 20],
                [250, 7500, 25, 8000, 20],
                [1000, 45003, 20, 90, 40],
                [1500, 75000, 30, 70, 25],
                [1250, 60000, 50, 80, 20],
                [200, 5000, 30, 10000, 30],
                [800, 12050, 40, 2000, 45],
                [600, 11000, 50, 3000, 50],
                [700, 11750, 20, 2750, 55],
                [1200, 52000, 10, 75, 60],
            ],
            columns=[
                'number_of_users',
                'views',
                'number_of_creators',
                'losses',
                'number_of_advertisers',
            ],
        ).astype(float)
        column_types = {
            'number_of_users': 'number',
            'location': 'category',
            'views': 'number',
            'number_of_creators': 'number',
            'name': 'text',
            'losses': 'number',
            'number_of_advertisers': 'number',
        }
        statistics = {}
        df = clean_dataframe(df, column_types, dropna=False)
        rule = RemoveCollinearColumns(df, column_types, statistics)
        assert_frame_equal(cleaned_df, rule.numeric_df.reset_index(drop=True))
        results = rule.evaluate()
        expected_results = [
            dict(
                title='Remove collinear columns',
                message='Delete these columns to remove redundant data and increase data quality.',
                status='not_applied',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['number_of_users'],
                    axis='column',
                    action_options={},
                    action_variables={},
                    action_code='',
                    outputs=[],
                ),
            )
        ]
        self.assertEqual(results, expected_results)

    # TODO: Make this test case deterministic
    # def test_perfectly_collinear(self):
    #     number_of_users = self.rng.integers(1000, 500000, (10000))
    #     views = number_of_users * 300
    #     revenue = 2 * views - number_of_users
    #     losses = revenue / views + number_of_users
    #     df = pd.DataFrame(
    #         {
    #             'number_of_users': number_of_users,
    #             'views': views,
    #             'revenue': revenue,
    #             'losses': losses,
    #         }
    #     )
    #     column_types = {
    #         'number_of_users': 'number',
    #         'views': 'number',
    #         'revenue': 'number',
    #         'losses': 'number',
    #     }
    #     statistics = {}
    #     df = clean_dataframe(df, column_types, dropna=False)
    #     result = RemoveCollinearColumns(df, column_types, statistics).evaluate()
    #     expected_results = [
    #         dict(
    #             title='Remove collinear columns',
    #             message='Delete these columns to remove redundant data and increase '
    #                     'data quality.',
    #             status='not_applied',
    #             action_payload=dict(
    #                 action_type='remove',
    #                 action_arguments=['revenue', 'views'],
    #                 axis='column',
    #                 action_options={},
    #                 action_variables={},
    #                 action_code='',
    #                 outputs=[],
    #             ),
    #         )
    #     ]
    #     self.assertEqual(result, expected_results)
