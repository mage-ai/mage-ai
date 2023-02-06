from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.row import (
    drop_duplicates,
    # explode,
    filter_rows,
    sort_rows,
    remove_row,
)
from mage_ai.tests.base_test import TestCase
from pandas.testing import assert_frame_equal
import numpy as np
import pandas as pd


class RowTests(TestCase):
    def test_drop_duplicates(self):
        df = pd.DataFrame(
            [
                [0, False, 'a'],
                [1, True, 'b'],
                [1, True, 'c'],
                [0, True, 'd'],
                [1, True, 'b'],
            ],
            columns=[
                'integer',
                'boolean',
                'string',
            ],
        )

        test_cases = [
            (dict(action_arguments=['integer']), df.iloc[[3, 4]]),
            (
                dict(action_arguments=['integer'], action_options=dict(keep='first')),
                df.iloc[[0, 1]],
            ),
            (dict(action_arguments=['boolean']), df.iloc[[0, 4]]),
            (
                dict(action_arguments=['boolean'], action_options=dict(keep='first')),
                df.iloc[[0, 1]],
            ),
            (dict(action_arguments=['integer', 'boolean']), df.iloc[[0, 3, 4]]),
            (dict(action_arguments=[]), df.iloc[[0, 2, 3, 4]]),
        ]

        for action, val in test_cases:
            self.assertTrue(drop_duplicates(df, action).equals(val))

    # def test_explode(self):
    #     df = pd.DataFrame([
    #         ['(a, b, c)'],
    #         ['[b, c, d]'],
    #         [' e, f '],
    #     ], columns=['tags'])
    #     action = dict(
    #         action_arguments=['tags'],
    #         action_options={
    #             'separator': ',',
    #         },
    #         outputs=[
    #             dict(
    #                 uuid='tag',
    #                 column_type='text',
    #             ),
    #         ],
    #     )
    #     df_new = explode(df, action)
    #     df_expected = pd.DataFrame([
    #         ['a', '(a, b, c)'],
    #         ['b', '(a, b, c)'],
    #         ['c', '(a, b, c)'],
    #         ['b', '[b, c, d]'],
    #         ['c', '[b, c, d]'],
    #         ['d', '[b, c, d]'],
    #         ['e', ' e, f '],
    #         ['f', ' e, f '],
    #     ], columns=['tag', 'tags'])
    #     assert_frame_equal(df_new.reset_index(drop=True), df_expected)

    def test_filter_rows(self):
        df = pd.DataFrame(
            [
                [0, False, 'a'],
                [1, True, 'b'],
            ],
            columns=[
                'integer',
                'boolean',
                'string',
            ],
        )

        test_cases = [
            ([0, False, 'a'], 'integer == 0'),
            ([0, False, 'a'], 'string == \'a\''),
            ([1, True, 'b'], 'boolean == True'),
            ([1, True, 'b'], 'integer >= 1'),
            ([1, True, 'b'], 'integer >= 1 and boolean == True'),
            ([1, True, 'b'], 'integer >= 1 and (boolean == False or string == \'b\')'),
        ]

        for val, query in test_cases:
            self.assertEqual(
                val,
                filter_rows(df, dict(action_code=query)).iloc[0].values.tolist(),
            )

    def test_filter_rows_is_null(self):
        df = pd.DataFrame(
            [
                [None, False, 'a'],
                [2, True, 'b'],
                [3, False, 'c'],
                [1, None, 'a'],
                [2, True, 'b'],
                [3, '', 'c'],
                [1, False, None],
                [2, True, 'b'],
                [3, False, ''],
            ],
            columns=[
                'integer',
                'boolean',
                'string',
            ],
        )

        integer_rows = filter_rows(
            df,
            dict(action_code='integer == null'),
            original_df=df,
        ).values.tolist()
        self.assertEqual(len(integer_rows), 1)
        self.assertEqual(integer_rows[0][1], False)
        self.assertEqual(integer_rows[0][2], 'a')

        boolean_rows = filter_rows(
            df,
            dict(action_code='boolean == null'),
            original_df=df,
        ).values.tolist()
        self.assertEqual(len(boolean_rows), 2)
        self.assertEqual(boolean_rows[0][0], 1.0)
        self.assertEqual(boolean_rows[0][1], None)
        self.assertEqual(boolean_rows[0][2], 'a')
        self.assertEqual(boolean_rows[1][0], 3.0)
        self.assertEqual(boolean_rows[1][1], '')
        self.assertEqual(boolean_rows[1][2], 'c')

        string_rows = filter_rows(
            df,
            dict(action_code='string == null'),
            original_df=df,
        ).values.tolist()
        self.assertEqual(len(string_rows), 2)
        self.assertEqual(string_rows[0][0], 1.0)
        self.assertEqual(string_rows[0][1], False)
        self.assertEqual(string_rows[0][2], None)
        self.assertEqual(string_rows[1][0], 3.0)
        self.assertEqual(string_rows[1][1], False)
        self.assertEqual(string_rows[1][2], '')

    def test_filter_rows_is_not_null(self):
        df = pd.DataFrame(
            [
                [None, False, 'a'],
                [2, True, 'b'],
                [3, False, 'c'],
                [1, None, 'a'],
                [2, True, 'b'],
                [3, '', 'c'],
                [1, False, None],
                [2, True, 'b'],
                [3, False, ''],
            ],
            columns=[
                'integer',
                'boolean',
                'string',
            ],
        )
        integer_rows = filter_rows(
            df,
            dict(action_code='integer != null'),
            original_df=df,
        )['integer'].values.tolist()
        self.assertEqual(
            integer_rows,
            [
                2,
                3,
                1,
                2,
                3,
                1,
                2,
                3,
            ],
        )

        boolean_rows = filter_rows(
            df,
            dict(action_code='boolean != null'),
            original_df=df,
        )['boolean'].values.tolist()
        self.assertEqual(
            boolean_rows,
            [
                False,
                True,
                False,
                True,
                False,
                True,
                False,
            ],
        )

        string_rows = filter_rows(
            df,
            dict(action_code='string != null'),
            original_df=df,
        )['string'].values.tolist()
        self.assertEqual(
            string_rows,
            [
                'a',
                'b',
                'c',
                'a',
                'b',
                'c',
                'b',
            ],
        )

    def test_filter_row_contains_string(self):
        df = pd.DataFrame(
            [
                ['fsdijfosidjfiosfj'],
                ['abc@123.com'],
                [np.NaN],
                ['fsdfsdfdsfdsf'],
                ['xyz@456.com'],
            ],
            columns=[
                'id',
            ],
        )
        action = dict(
            action_code='id contains @',
        )
        action2 = dict(
            action_code='id contains \'@\'',
        )
        df_new = filter_rows(df, action, original_df=df).reset_index(drop=True)
        df_new2 = filter_rows(df, action2, original_df=df).reset_index(drop=True)
        df_expected = pd.DataFrame(
            [
                ['abc@123.com'],
                ['xyz@456.com'],
            ],
            columns=[
                'id',
            ],
        )
        assert_frame_equal(df_new, df_expected)
        assert_frame_equal(df_new2, df_expected)

    def test_filter_row_not_contains_string(self):
        df = pd.DataFrame(
            [
                [np.NaN, False],
                ['sfc@mailnet.com', True],
                ['fdss@emailserver.net', True],
                ['fsdfsdfdsfdsf', False],
                ['xyz@mailnet.com', False],
                ['eeeeasdf', True],
            ],
            columns=['email', 'subscription'],
        )
        action = dict(
            action_code='email not contains mailnet',
        )
        action2 = dict(
            action_code='email not contains \'mailnet\'',
        )
        action3 = dict(
            action_code='email not contains @',
        )
        action4 = dict(
            action_code='email not contains \'^e+\w\'',  # noqa: W605
        )
        action_invalid = dict(action_code='subscription not contains False')
        df_new = filter_rows(df, action, original_df=df).reset_index(drop=True)
        df_new2 = filter_rows(df, action2, original_df=df).reset_index(drop=True)
        df_new3 = filter_rows(df, action3, original_df=df).reset_index(drop=True)
        df_new4 = filter_rows(df, action4, original_df=df).reset_index(drop=True)
        df_expected1 = pd.DataFrame(
            [
                [np.NaN, False],
                ['fdss@emailserver.net', True],
                ['fsdfsdfdsfdsf', False],
                ['eeeeasdf', True],
            ],
            columns=['email', 'subscription'],
        )
        df_expected2 = pd.DataFrame(
            [[np.NaN, False], ['fsdfsdfdsfdsf', False], ['eeeeasdf', True]],
            columns=['email', 'subscription'],
        )
        df_expected3 = pd.DataFrame(
            [
                [np.NaN, False],
                ['sfc@mailnet.com', True],
                ['fdss@emailserver.net', True],
                ['fsdfsdfdsfdsf', False],
                ['xyz@mailnet.com', False],
            ],
            columns=['email', 'subscription'],
        )
        assert_frame_equal(df_new, df_expected1)
        assert_frame_equal(df_new2, df_expected1)
        assert_frame_equal(df_new3, df_expected2)
        assert_frame_equal(df_new4, df_expected3)

        with self.assertRaises(Exception):
            _ = filter_rows(df, action_invalid, original_df=df).reset_index(drop=True)

    def test_filter_rows_multi_condition(self):
        df = pd.DataFrame(
            [
                [100, None, '', 10],
                [250, 'brand1', False, np.NaN],
                [np.NaN, 'brand2', None, 18],
                [50, 'brand1', True, 13],
                [75, '', '', 80],
                [None, 'company3', False, 23],
            ],
            columns=['value', 'brand', 'discounted', 'inventory'],
        )
        action = dict(action_code='(value < 110 and value >= 50) and (value != null)')
        action2 = dict(action_code='brand contains brand and inventory != null')
        action3 = dict(action_code='(brand != null and value > 60) or (discounted == null)')
        action4 = dict(
            action_code='(discounted == True and inventory > 15)'
            ' or (discounted == False and value != null)'
        )
        action5 = dict(
            action_code='(brand not contains company and value == 75 and inventory <= 80)'
            ' or (discounted != null)'
        )
        df_expected = pd.DataFrame(
            [
                [100, None, '', 10],
                [50, 'brand1', True, 13],
                [75, '', '', 80],
            ],
            columns=['value', 'brand', 'discounted', 'inventory'],
        )
        df_expected2 = pd.DataFrame(
            [
                [np.NaN, 'brand2', None, 18],
                [50, 'brand1', True, 13],
            ],
            columns=['value', 'brand', 'discounted', 'inventory'],
        )
        df_expected3 = pd.DataFrame(
            [
                [100, None, '', 10],
                [250, 'brand1', False, np.NaN],
                [np.NaN, 'brand2', None, 18],
                [75, '', '', 80],
            ],
            columns=['value', 'brand', 'discounted', 'inventory'],
        )
        df_expected4 = pd.DataFrame(
            [
                [250, 'brand1', False, np.NaN],
            ],
            columns=['value', 'brand', 'discounted', 'inventory'],
        )
        df_expected5 = pd.DataFrame(
            [
                [250, 'brand1', False, np.NaN],
                [50, 'brand1', True, 13],
                [75, '', '', 80],
                [None, 'company3', False, 23],
            ],
            columns=['value', 'brand', 'discounted', 'inventory'],
        )
        df_new = filter_rows(df, action, original_df=df).reset_index(drop=True)
        df_new2 = filter_rows(df, action2, original_df=df).reset_index(drop=True)
        df_new3 = filter_rows(df, action3, original_df=df).reset_index(drop=True)
        df_new4 = filter_rows(df, action4, original_df=df).reset_index(drop=True)
        df_new5 = filter_rows(df, action5, original_df=df).reset_index(drop=True)
        df_new['value'] = df_new['value'].astype(int)
        df_new['inventory'] = df_new['inventory'].astype(int)
        df_new2['brand'] = df_new2['brand'].astype(str)
        df_new2['inventory'] = df_new2['inventory'].astype(int)
        df_new4['value'] = df_new4['value'].astype(int)
        df_new4['brand'] = df_new4['brand'].astype(str)
        df_new4['discounted'] = df_new4['discounted'].astype(bool)
        assert_frame_equal(df_expected, df_new)
        assert_frame_equal(df_expected2, df_new2)
        assert_frame_equal(df_expected3, df_new3)
        assert_frame_equal(df_expected4, df_new4)
        assert_frame_equal(df_expected5, df_new5)

    def test_filter_row_implicit_null(self):
        # tests that implicit null values in the transformed dataframe are still removed
        df = pd.DataFrame(
            [
                [100, None, '', 10],
                [250, 'brand1', False, np.NaN],
                [np.NaN, 'brand2', None, 18],
                [50, 'brand1', True, 13],
                [75, '', '', 80],
                [None, 'company3', False, 23],
            ],
            columns=['value', 'brand', 'discounted', 'inventory'],
        )
        action_payload = {
            'action_type': 'filter',
            'action_code': '%{1} != null',
            'action_arguments': [],
            'action_options': {},
            'axis': 'row',
            'action_variables': {
                '1': {
                    'id': 'value',
                    'type': 'feature',
                    'feature': {'column_type': 'number', 'uuid': 'value'},
                },
            },
            'outputs': [],
        }
        action = BaseAction(action_payload)
        df_new = action.execute(df).reset_index(drop=True)
        df_expected = pd.DataFrame(
            [
                [100, None, '', 10],
                [250, 'brand1', False, np.NaN],
                [50, 'brand1', True, 13],
                [75, '', '', 80],
            ],
            columns=['value', 'brand', 'discounted', 'inventory'],
        )
        df_new['value'] = df_new['value'].astype(int)
        assert_frame_equal(df_expected, df_new)

    def test_filter_row_dirty_columns(self):
        df = pd.DataFrame(
            [
                [100, None, '', 10],
                [250, 'brand1', False, np.NaN],
                [np.NaN, 'brand2', None, 18],
                [50, 'brand1', True, 13],
                [75, '', '', 80],
                [None, 'company3', False, 23],
            ],
            columns=['Val ue', 'bra  23423  nd', 'dis>>> ??cou nted', 'invVe nTory'],
        )
        action = dict(action_code='("Val ue" < 110 and "Val ue" >= 50) and ("Val ue" != null)')
        action2 = dict(action_code='"bra  23423  nd" contains brand and "invVe nTory" != null')
        action3 = dict(
            action_code='("bra  23423  nd" != null and "Val ue" > 60) or ("dis>>> ??cou nted" '
                        '== null)'
        )
        action4 = dict(
            action_code='("dis>>> ??cou nted" == True and "invVe nTory" > 15)'
            ' or ("dis>>> ??cou nted" == False and "Val ue" != null)'
        )
        action5 = dict(
            action_code='("bra  23423  nd" not contains company and "Val ue" == 75 and "invVe '
                        'nTory" <= 80) or ("dis>>> ??cou nted" != null)'
        )
        df_expected = pd.DataFrame(
            [
                [100, None, '', 10],
                [50, 'brand1', True, 13],
                [75, '', '', 80],
            ],
            columns=['Val ue', 'bra  23423  nd', 'dis>>> ??cou nted', 'invVe nTory'],
        )
        df_expected2 = pd.DataFrame(
            [
                [np.NaN, 'brand2', None, 18],
                [50, 'brand1', True, 13],
            ],
            columns=['Val ue', 'bra  23423  nd', 'dis>>> ??cou nted', 'invVe nTory'],
        )
        df_expected3 = pd.DataFrame(
            [
                [100, None, '', 10],
                [250, 'brand1', False, np.NaN],
                [np.NaN, 'brand2', None, 18],
                [75, '', '', 80],
            ],
            columns=['Val ue', 'bra  23423  nd', 'dis>>> ??cou nted', 'invVe nTory'],
        )
        df_expected4 = pd.DataFrame(
            [
                [250, 'brand1', False, np.NaN],
            ],
            columns=['Val ue', 'bra  23423  nd', 'dis>>> ??cou nted', 'invVe nTory'],
        )
        df_expected5 = pd.DataFrame(
            [
                [250, 'brand1', False, np.NaN],
                [50, 'brand1', True, 13],
                [75, '', '', 80],
                [None, 'company3', False, 23],
            ],
            columns=['Val ue', 'bra  23423  nd', 'dis>>> ??cou nted', 'invVe nTory'],
        )
        df_new = filter_rows(df, action, original_df=df).reset_index(drop=True)
        df_new2 = filter_rows(df, action2, original_df=df).reset_index(drop=True)
        df_new3 = filter_rows(df, action3, original_df=df).reset_index(drop=True)
        df_new4 = filter_rows(df, action4, original_df=df).reset_index(drop=True)
        df_new5 = filter_rows(df, action5, original_df=df).reset_index(drop=True)
        df_new['Val ue'] = df_new['Val ue'].astype(int)
        df_new['invVe nTory'] = df_new['invVe nTory'].astype(int)
        df_new2['bra  23423  nd'] = df_new2['bra  23423  nd'].astype(str)
        df_new2['invVe nTory'] = df_new2['invVe nTory'].astype(int)
        df_new4['Val ue'] = df_new4['Val ue'].astype(int)
        df_new4['bra  23423  nd'] = df_new4['bra  23423  nd'].astype(str)
        df_new4['dis>>> ??cou nted'] = df_new4['dis>>> ??cou nted'].astype(bool)
        assert_frame_equal(df_expected, df_new)
        assert_frame_equal(df_expected2, df_new2)
        assert_frame_equal(df_expected3, df_new3)
        assert_frame_equal(df_expected4, df_new4)
        assert_frame_equal(df_expected5, df_new5)

    def test_filter_row_comparing_two_dirty_cols(self):
        df = pd.DataFrame(
            [
                [23.5, 0.2342],
                [-9230.3, 98],
                [23.5, -0.32342],
                [432, 432],
                [34.2342, 0.082392],
                [23.5, np.nan],
                [None, 0.2342],
            ],
            columns=['e e e e e  e e e', ' kas22d fe ($)'],
        )
        action = dict(
            action_code='("e e e e e  e e e" != null and " kas22d fe ($)" != null) and "e e e e '
                        'e  e e e" > " kas22d fe ($)"'
        )
        action2 = dict(
            action_code='("e e e e e  e e e" != null and " kas22d fe ($)" != null) and "e e e e '
                        'e  e e e" <= " kas22d fe ($)"'
        )
        df_expected = pd.DataFrame(
            [
                [23.5, 0.2342],
                [23.5, -0.32342],
                [34.2342, 0.082392],
            ],
            columns=['e e e e e  e e e', ' kas22d fe ($)'],
        )
        df_expected2 = pd.DataFrame(
            [
                [-9230.3, 98],
                [432, 432],
            ],
            columns=['e e e e e  e e e', ' kas22d fe ($)'],
        )
        df_new = filter_rows(df, action, original_df=df).reset_index(drop=True)
        df_new2 = filter_rows(df, action2, original_df=df).reset_index(drop=True)
        df_new['e e e e e  e e e'] = df_new['e e e e e  e e e'].astype(float)
        df_new2['e e e e e  e e e'] = df_new2['e e e e e  e e e'].astype(float)
        df_new[' kas22d fe ($)'] = df_new[' kas22d fe ($)'].astype(float)
        df_new2[' kas22d fe ($)'] = df_new2[' kas22d fe ($)'].astype(int)
        assert_frame_equal(df_expected, df_new)
        assert_frame_equal(df_expected2, df_new2)

    def test_filter_row_dirty_columns_two(self):
        df = pd.DataFrame(
            [
                [np.NaN, False],
                ['sfc@mailnet.com', True],
                ['fdss@emailserver.net', True],
                ['fsdfsdfdsfdsf', False],
                ['xyz@mailnet.com', False],
                ['eeeeasdf', True],
            ],
            columns=['e e e e e e email', 'subs crip tion'],
        )
        action = dict(
            action_code='"e e e e e e email" not contains mailnet',
        )
        action2 = dict(
            action_code='"e e e e e e email" not contains \'mailnet\'',
        )
        action3 = dict(
            action_code='"e e e e e e email" not contains @',
        )
        action4 = dict(
            action_code='"e e e e e e email" not contains \'^e+\w\'',  # noqa: W605
        )
        action_invalid = dict(action_code='"subs crip tion" not contains False')
        df_new = filter_rows(df, action, original_df=df).reset_index(drop=True)
        df_new2 = filter_rows(df, action2, original_df=df).reset_index(drop=True)
        df_new3 = filter_rows(df, action3, original_df=df).reset_index(drop=True)
        df_new4 = filter_rows(df, action4, original_df=df).reset_index(drop=True)
        df_expected1 = pd.DataFrame(
            [
                [np.NaN, False],
                ['fdss@emailserver.net', True],
                ['fsdfsdfdsfdsf', False],
                ['eeeeasdf', True],
            ],
            columns=['e e e e e e email', 'subs crip tion'],
        )
        df_expected2 = pd.DataFrame(
            [[np.NaN, False], ['fsdfsdfdsfdsf', False], ['eeeeasdf', True]],
            columns=['e e e e e e email', 'subs crip tion'],
        )
        df_expected3 = pd.DataFrame(
            [
                [np.NaN, False],
                ['sfc@mailnet.com', True],
                ['fdss@emailserver.net', True],
                ['fsdfsdfdsfdsf', False],
                ['xyz@mailnet.com', False],
            ],
            columns=['e e e e e e email', 'subs crip tion'],
        )
        assert_frame_equal(df_new, df_expected1)
        assert_frame_equal(df_new2, df_expected1)
        assert_frame_equal(df_new3, df_expected2)
        assert_frame_equal(df_new4, df_expected3)

        with self.assertRaises(Exception):
            _ = filter_rows(df, action_invalid, original_df=df).reset_index(drop=True)

    def test_original_df_column_name_padding(self):
        # tests edge cases for when columns with the special prefixes "orig_" and "tf_" are given
        # as input
        df = pd.DataFrame(
            [[0, 1, None], [1, 2, np.NaN], [np.NaN, 3, 4], [3, None, 5]],
            columns=['col', 'orig_col', 'tf_col'],
        )
        df_expected = pd.DataFrame(
            [
                [0, 1, None],
                [1, 2, np.NaN],
            ],
            columns=['col', 'orig_col', 'tf_col'],
        )
        action = dict(action_code='(col != null) and (orig_col != null)')
        df_new = filter_rows(df, action, original_df=df)
        df_new['col'] = df_new['col'].astype(int)
        df_new['orig_col'] = df_new['orig_col'].astype(int)
        assert_frame_equal(df_new, df_expected)

    def test_valid_columns_names(self):
        df = pd.DataFrame(
            [
                [
                    False,
                    False,
                    False,
                    False,
                ],
            ],
            columns=[
                '+=  -*&^%$! ?~  |<>',
                'this.is.an.operator',
                'are,commas,an,operator',
                'are()[]{}operators',
            ],
        )
        for column in df.columns:
            with self.assertRaises(Exception):
                action = dict(action_code=f'{column} == False')
                filter_rows(df, action, original_df=df)

        for column in df.columns:
            action = dict(action_code=f'"{column}" == False')
            filter_rows(df, action, original_df=df)

    def test_sort_rows(self):
        df = pd.DataFrame(
            [
                [0, False, 'a'],
                [1, True, 'b'],
                [1, True, 'c'],
                [0, True, 'd'],
            ],
            columns=[
                'integer',
                'boolean',
                'string',
            ],
        )

        test_cases = [
            (dict(action_arguments=['integer']), df.iloc[[0, 3, 1, 2]]),
            (
                dict(action_arguments=['integer'], action_options=dict(ascending=False)),
                df.iloc[[1, 2, 0, 3]],
            ),
            (dict(action_arguments=['string']), df.iloc[[0, 1, 2, 3]]),
            (
                dict(action_arguments=['string'], action_options=dict(ascending=False)),
                df.iloc[[3, 2, 1, 0]],
            ),
        ]

        for action, val in test_cases:
            self.assertTrue(sort_rows(df, action).equals(val))

    def test_sort_rows_with_multiple_columns(self):
        df = pd.DataFrame(
            [
                [0, False, 'a'],
                [1, True, 'b'],
                [1, True, 'c'],
                [0, True, 'd'],
            ],
            columns=[
                'integer',
                'boolean',
                'string',
            ],
        )

        test_cases = [
            (dict(action_arguments=['integer', 'string']), df.iloc[[0, 3, 1, 2]]),
            (
                dict(
                    action_arguments=['integer', 'string'],
                    action_options=dict(ascendings=[False, False]),
                ),
                df.iloc[[2, 1, 3, 0]],
            ),
            (
                dict(
                    action_arguments=['integer', 'string'],
                    action_options=dict(ascendings=[True, False]),
                ),
                df.iloc[[3, 0, 2, 1]],
            ),
            (
                dict(action_arguments=['string', 'integer'], action_options=dict(ascending=False)),
                df.iloc[[3, 2, 1, 0]],
            ),
        ]

        for action, val in test_cases:
            self.assertTrue(sort_rows(df, action).equals(val))

    def test_sort_rows_with_number_and_empty_strings(self):
        df = pd.DataFrame(
            [
                [0],
                [None],
                [3],
                [''],
                [1],
                [2],
            ],
            columns=[
                'integer',
            ],
        )

        test_cases = [
            (dict(ascending=True), df.iloc[[1, 3, 0, 4, 5, 2]]),
            (dict(ascending=False), df.iloc[[2, 5, 4, 0, 1, 3]]),
        ]
        for action_options, val in test_cases:
            action = dict(
                action_arguments=['integer'],
                action_variables={
                    '1': dict(
                        feature=dict(
                            column_type='number',
                            uuid='integer',
                        ),
                    ),
                },
                action_options=action_options,
            )

            self.assertTrue(sort_rows(df, action).equals(val))

    def test_remove_rows(self):
        df = pd.DataFrame(
            [
                [0, False, 'a'],
                [1, True, 'b'],
                [1, True, 'c'],
                [0, True, 'd'],
            ],
            columns=[
                'integer',
                'boolean',
                'string',
            ],
        )
        action1 = dict(
            action_type='remove',
            action_arguments=[],
            action_code='',
            action_options={
                'rows': [0, 3, 4, 5],
            },
            action_variables={},
            axis='row',
            outputs=[],
        )
        action2 = dict(
            action_type='remove',
            action_arguments=[],
            action_code='',
            action_options={
                'rows': [-1, 0, 1, 2, 3, 4],
            },
            action_variables={},
            axis='row',
            outputs=[],
        )
        expected_df = pd.DataFrame(
            [
                [1, True, 'b'],
                [1, True, 'c'],
            ],
            columns=[
                'integer',
                'boolean',
                'string',
            ],
        )
        expected_df.index = pd.Int64Index([1, 2])
        expected_df2 = pd.DataFrame(
            [],
            columns=[
                'integer',
                'boolean',
                'string',
            ],
        )
        expected_df2.index = pd.Int64Index([])
        new_df = remove_row(df, action1)
        new_df2 = remove_row(df, action2).astype(object)
        assert_frame_equal(new_df, expected_df)
        assert_frame_equal(new_df2, expected_df2)
