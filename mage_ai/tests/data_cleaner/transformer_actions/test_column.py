from datetime import datetime as dt
from mage_ai.data_cleaner.transformer_actions.column import (
    add_column,
    count,
    count_distinct,
    clean_column_names,
    diff,
    # expand_column,
    first,
    fix_syntax_errors,
    last,
    remove_column,
    select,
    shift_down,
    shift_up,
)
from mage_ai.tests.base_test import TestCase
from pandas.testing import assert_frame_equal
from random import seed
import numpy as np
import pandas as pd

TEST_DATAFRAME = pd.DataFrame(
    [
        [1, 1000],
        [2, 1050],
        [1, 1100],
        [2, 1150],
    ],
    columns=[
        'group_id',
        'amount',
    ],
)


class ColumnTests(TestCase):
    def setUp(self):
        seed(42)
        return super().setUp()

    def test_remove_column(self):
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

        action = dict(action_arguments=['string'])

        df_new = remove_column(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    integer=0,
                    boolean=False,
                ),
                dict(
                    integer=1,
                    boolean=True,
                ),
            ],
        )

        action = dict(action_arguments=['integer', 'boolean'])

        df_new = remove_column(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    string='a',
                ),
                dict(
                    string='b',
                ),
            ],
        )

    def test_add_column_addition(self):
        df = pd.DataFrame(
            [
                [1, 3, 7, 9],
                [4, 2, 9, 3],
            ],
            columns=[
                'integer1',
                'integer2',
                'integer3',
                'integer4',
            ],
        )
        action1 = dict(
            action_arguments=[
                'integer1',
                'integer2',
                'integer3',
            ],
            action_options={
                'udf': 'addition',
                'value': None,
            },
            outputs=[
                dict(
                    uuid='integer_addition',
                    column_type='number',
                ),
            ],
        )
        action2 = dict(
            action_arguments=['integer1'],
            action_options={
                'udf': 'addition',
                'value': 10,
            },
            outputs=[
                dict(
                    uuid='integer_addition2',
                    column_type='number',
                ),
            ],
        )
        action3 = dict(
            action_arguments=['integer1', 'integer4'],
            action_options={
                'udf': 'addition',
                'value': 10,
            },
            outputs=[
                dict(
                    uuid='integer_addition3',
                    column_type='number',
                ),
            ],
        )
        df_new = add_column(
            add_column(
                add_column(df, action1),
                action2,
            ),
            action3,
        )
        df_expected = pd.DataFrame(
            [
                [1, 3, 7, 9, 11, 11, 20],
                [4, 2, 9, 3, 15, 14, 17],
            ],
            columns=[
                'integer1',
                'integer2',
                'integer3',
                'integer4',
                'integer_addition',
                'integer_addition2',
                'integer_addition3',
            ],
        )
        assert_frame_equal(df_new, df_expected)

    def test_add_column_addition_days(self):
        df = pd.DataFrame(
            [
                ['2021-08-31'],
                ['2021-08-28'],
            ],
            columns=[
                'created_at',
            ],
        )
        action = dict(
            action_arguments=['created_at'],
            action_options=dict(
                column_type='datetime',
                time_unit='d',
                udf='addition',
                value=3,
            ),
            outputs=[
                dict(
                    uuid='3d_after_creation',
                    column_type='text',
                ),
            ],
        )
        df_new = add_column(df, action)
        df_expected = pd.DataFrame(
            [
                ['2021-08-31', '2021-09-03 00:00:00'],
                ['2021-08-28', '2021-08-31 00:00:00'],
            ],
            columns=['created_at', '3d_after_creation'],
        )
        assert_frame_equal(df_new, df_expected)

    def test_add_column_constant(self):
        df = pd.DataFrame(
            [
                [False],
                [True],
            ],
            columns=[
                'boolean',
            ],
        )
        action = dict(
            action_arguments=[10],
            action_options=dict(
                udf='constant',
            ),
            outputs=[
                dict(
                    uuid='integer',
                    column_type='number',
                ),
            ],
        )
        df_new = add_column(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    boolean=False,
                    integer=10,
                ),
                dict(
                    boolean=True,
                    integer=10,
                ),
            ],
        )

    def test_add_column_date_trunc(self):
        df = pd.DataFrame(
            [
                ['2021-08-31', False],
                ['2021-08-28', True],
            ],
            columns=[
                'created_at',
                'boolean',
            ],
        )
        action = dict(
            action_arguments=['created_at'],
            action_options=dict(
                udf='date_trunc',
                date_part='week',
            ),
            outputs=[
                dict(
                    uuid='week_date',
                    column_type='text',
                ),
            ],
        )
        df_new = add_column(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    created_at='2021-08-31',
                    boolean=False,
                    week_date='2021-08-30',
                ),
                dict(
                    created_at='2021-08-28',
                    boolean=True,
                    week_date='2021-08-23',
                ),
            ],
        )

    def test_add_column_difference(self):
        df = pd.DataFrame(
            [
                [1, 3],
                [4, 2],
            ],
            columns=[
                'integer1',
                'integer2',
            ],
        )
        action1 = dict(
            action_arguments=['integer1', 'integer2'],
            action_options={
                'udf': 'difference',
            },
            outputs=[
                dict(
                    uuid='integer_difference',
                    column_type='number',
                ),
            ],
        )
        action2 = dict(
            action_arguments=['integer1'],
            action_options={
                'udf': 'difference',
                'value': 10,
            },
            outputs=[
                dict(
                    uuid='integer_difference2',
                    column_type='number',
                ),
            ],
        )
        df_new = add_column(add_column(df, action1), action2)
        df_expected = pd.DataFrame(
            [
                [1, 3, -2, -9],
                [4, 2, 2, -6],
            ],
            columns=['integer1', 'integer2', 'integer_difference', 'integer_difference2'],
        )
        assert_frame_equal(df_new, df_expected)

    def test_add_column_difference_days(self):
        df = pd.DataFrame(
            [
                ['2021-08-31', '2021-09-14'],
                ['2021-08-28', '2021-09-03'],
            ],
            columns=[
                'created_at',
                'converted_at',
            ],
        )
        action = dict(
            action_arguments=['converted_at', 'created_at'],
            action_options=dict(
                column_type='datetime',
                time_unit='d',
                udf='difference',
            ),
            outputs=[
                dict(
                    uuid='days_diff',
                    column_type='number',
                ),
            ],
        )
        df_new = add_column(df, action)
        df_expected = pd.DataFrame(
            [
                ['2021-08-31', '2021-09-14', 14],
                ['2021-08-28', '2021-09-03', 6],
            ],
            columns=[
                'created_at',
                'converted_at',
                'days_diff',
            ],
        )
        assert_frame_equal(df_new, df_expected)

    def test_add_column_distance_between(self):
        df = pd.DataFrame(
            [
                [26.05308, -97.31838, 33.41939, -112.32606],
                [39.71954, -84.13056, 33.41939, -112.32606],
            ],
            columns=[
                'lat1',
                'lng1',
                'lat2',
                'lng2',
            ],
        )
        action = dict(
            action_arguments=['lat1', 'lng1', 'lat2', 'lng2'],
            action_options=dict(
                udf='distance_between',
            ),
            outputs=[
                dict(
                    uuid='distance',
                    column_type='number_with_decimals',
                ),
            ],
        )
        df_new = add_column(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    lat1=26.05308,
                    lng1=-97.31838,
                    lat2=33.41939,
                    lng2=-112.32606,
                    distance=1661.8978520305657,
                ),
                dict(
                    lat1=39.71954,
                    lng1=-84.13056,
                    lat2=33.41939,
                    lng2=-112.32606,
                    distance=2601.5452571116184,
                ),
            ],
        )

    def test_add_column_divide(self):
        df = pd.DataFrame(
            [
                [12, 3, 70, 9],
                [4, 2, 90, 3],
            ],
            columns=[
                'integer1',
                'integer2',
                'integer3',
                'integer4',
            ],
        )
        action1 = dict(
            action_arguments=[
                'integer1',
                'integer2',
            ],
            action_options={
                'udf': 'divide',
            },
            outputs=[
                dict(
                    uuid='integer_divide',
                    column_type='number',
                ),
            ],
        )
        action2 = dict(
            action_arguments=['integer3'],
            action_options={
                'udf': 'divide',
                'value': 10,
            },
            outputs=[
                dict(
                    uuid='integer_divide2',
                    column_type='number',
                ),
            ],
        )
        df_new = add_column(add_column(df, action1), action2)
        df_expected = pd.DataFrame(
            [
                [12, 3, 70, 9, 4, 7],
                [4, 2, 90, 3, 2, 9],
            ],
            columns=[
                'integer1',
                'integer2',
                'integer3',
                'integer4',
                'integer_divide',
                'integer_divide2',
            ],
        )
        assert_frame_equal(df_new, df_expected)

    # def test_add_column_extract_dict_string(self):
    #     df = pd.DataFrame([
    #         '{\'country\': \'US\', \'age\': \'20\'}',
    #         '{\'country\': \'CA\'}',
    #         '{\'country\': \'UK\', \'age\': \'24\'}',
    #         '',
    #     ], columns=[
    #         'properties',
    #     ])
    #     action = dict(
    #         action_arguments=['properties', 'country'],
    #         action_options=dict(
    #             udf='extract_dict_value',
    #         ),
    #         outputs=[
    #             dict(
    #                 uuid='property_country',
    #                 column_type='text',
    #             ),
    #         ],
    #     )
    #     df_new = add_column(df, action)
    #     self.assertEqual(df_new.to_dict(orient='records'), [
    #         dict(
    #             properties='{\'country\': \'US\', \'age\': \'20\'}',
    #             property_country='US',
    #         ),
    #         dict(
    #             properties='{\'country\': \'CA\'}',
    #             property_country='CA',
    #         ),
    #         dict(
    #             properties='{\'country\': \'UK\', \'age\': \'24\'}',
    #             property_country='UK',
    #         ),
    #         dict(
    #             properties='',
    #             property_country=np.NaN,
    #         ),
    #     ])
    #     action2 = dict(
    #         action_arguments=['properties', 'age'],
    #         action_options=dict(
    #             udf='extract_dict_value',
    #         ),
    #         outputs=[
    #             dict(
    #                 uuid='property_age',
    #                 column_type='number',
    #             ),
    #         ],
    #     )
    #     df_new2 = add_column(df, action2)
    #     self.assertEqual(df_new2.to_dict(orient='records'), [
    #         dict(
    #             properties='{\'country\': \'US\', \'age\': \'20\'}',
    #             property_age=20,
    #         ),
    #         dict(
    #             properties='{\'country\': \'CA\'}',
    #             property_age=0,
    #         ),
    #         dict(
    #             properties='{\'country\': \'UK\', \'age\': \'24\'}',
    #             property_age=24,
    #         ),
    #         dict(
    #             properties='',
    #             property_age=0,
    #         ),
    #     ])

    # def test_add_column_extract_dict_string_with_json(self):
    #     df = pd.DataFrame([
    #         '{\"country\": \"US\", \"is_adult\": true}',
    #         '{\"country\": \"CA\"}',
    #         '{\"country\": \"UK\", \"is_adult\": false}',
    #         '',
    #     ], columns=[
    #         'properties',
    #     ])
    #     action = dict(
    #         action_arguments=['properties', 'country'],
    #         action_options=dict(
    #             udf='extract_dict_value',
    #         ),
    #         outputs=[
    #             dict(
    #                 uuid='property_country',
    #                 column_type='text',
    #             ),
    #         ],
    #     )
    #     df_new = add_column(df, action)
    #     self.assertEqual(df_new.to_dict(orient='records'), [
    #         dict(
    #             properties='{\"country\": \"US\", \"is_adult\": true}',
    #             property_country='US',
    #         ),
    #         dict(
    #             properties='{\"country\": \"CA\"}',
    #             property_country='CA',
    #         ),
    #         dict(
    #             properties='{\"country\": \"UK\", \"is_adult\": false}',
    #             property_country='UK',
    #         ),
    #         dict(
    #             properties='',
    #             property_country=np.NaN,
    #         ),
    #     ])
    #     action2 = dict(
    #         action_arguments=['properties', 'is_adult'],
    #         action_options=dict(
    #             udf='extract_dict_value',
    #         ),
    #         outputs=[
    #             dict(
    #                 uuid='property_is_adult',
    #                 column_type='true_or_false',
    #             ),
    #         ],
    #     )
    #     df_new2 = add_column(df, action2)
    #     self.assertEqual(df_new2.to_dict(orient='records'), [
    #         dict(
    #             properties='{\"country\": \"US\", \"is_adult\": true}',
    #             property_is_adult=True,
    #         ),
    #         dict(
    #             properties='{\"country\": \"CA\"}',
    #             property_is_adult=None,
    #         ),
    #         dict(
    #             properties='{\"country\": \"UK\", \"is_adult\": false}',
    #             property_is_adult=False,
    #         ),
    #         dict(
    #             properties='',
    #             property_is_adult=None,
    #         ),
    #     ])

    def test_add_column_formatted_date(self):
        df = pd.DataFrame(
            [
                ['2019-04-10 08:20:58', False],
                ['2019-03-05 03:30:30', True],
            ],
            columns=[
                'created_at',
                'boolean',
            ],
        )
        action = dict(
            action_arguments=['created_at'],
            action_options=dict(
                udf='formatted_date',
                format='%Y-%m-%d',
            ),
            outputs=[
                dict(
                    uuid='created_date',
                    column_type='text',
                ),
            ],
        )
        df_new = add_column(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    created_at='2019-04-10 08:20:58',
                    boolean=False,
                    created_date='2019-04-10',
                ),
                dict(
                    created_at='2019-03-05 03:30:30',
                    boolean=True,
                    created_date='2019-03-05',
                ),
            ],
        )

    def test_add_column_if_else(self):
        df = pd.DataFrame(
            [
                ['2019-04-10 08:20:58'],
                [None],
            ],
            columns=['converted_at'],
        )
        action = dict(
            action_arguments=[False, True],
            action_code='converted_at == null',
            action_options=dict(
                udf='if_else',
            ),
            outputs=[
                dict(
                    uuid='converted',
                    column_type='true_or_false',
                ),
            ],
        )
        df_new = add_column(df, action, original_df=df)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    converted_at='2019-04-10 08:20:58',
                    converted=True,
                ),
                dict(
                    converted_at=None,
                    converted=False,
                ),
            ],
        )

    def test_add_column_if_else_with_column(self):
        df = pd.DataFrame(
            [
                ['2019-04-10 08:20:58', 'test_user_id'],
                [None, None],
            ],
            columns=[
                'converted_at',
                'user_id',
            ],
        )
        action = dict(
            action_arguments=['unknown', 'user_id'],
            action_code='converted_at == null',
            action_options=dict(
                udf='if_else',
                arg1_type='value',
                arg2_type='column',
            ),
            outputs=[
                dict(
                    uuid='user_id_clean',
                    column_type='text',
                ),
            ],
        )
        df_new = add_column(df, action, original_df=df)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    converted_at='2019-04-10 08:20:58',
                    user_id='test_user_id',
                    user_id_clean='test_user_id',
                ),
                dict(
                    converted_at=None,
                    user_id=None,
                    user_id_clean='unknown',
                ),
            ],
        )

    def test_add_column_multiply(self):
        df = pd.DataFrame(
            [
                [1, 3, 7, 9],
                [4, 2, 9, 3],
            ],
            columns=[
                'integer1',
                'integer2',
                'integer3',
                'integer4',
            ],
        )
        action1 = dict(
            action_arguments=[
                'integer1',
                'integer2',
            ],
            action_options={
                'udf': 'multiply',
            },
            outputs=[
                dict(
                    uuid='integer_multiply',
                    column_type='number',
                ),
            ],
        )
        action2 = dict(
            action_arguments=['integer3'],
            action_options={
                'udf': 'multiply',
                'value': 10,
            },
            outputs=[
                dict(
                    uuid='integer_multiply2',
                    column_type='number',
                ),
            ],
        )
        df_new = add_column(add_column(df, action1), action2)
        df_expected = pd.DataFrame(
            [
                [1, 3, 7, 9, 3, 70],
                [4, 2, 9, 3, 8, 90],
            ],
            columns=[
                'integer1',
                'integer2',
                'integer3',
                'integer4',
                'integer_multiply',
                'integer_multiply2',
            ],
        )
        assert_frame_equal(df_new, df_expected)

    def test_add_column_string_replace(self):
        df = pd.DataFrame(
            [
                ['$1000'],
                ['$321.  '],
                ['$4,321'],
            ],
            columns=[
                'amount',
            ],
        )
        action = dict(
            action_arguments=['amount'],
            action_options={
                'udf': 'string_replace',
                'pattern': '\\$|\\.|\\,|\\s*',
                'replacement': '',
            },
            outputs=[
                dict(
                    uuid='amount_clean',
                    column_type='true_or_false',
                ),
            ],
        )
        df_new = add_column(df, action)
        df_expected = pd.DataFrame(
            [
                ['$1000', '1000'],
                ['$321.  ', '321'],
                ['$4,321', '4321'],
            ],
            columns=[
                'amount',
                'amount_clean',
            ],
        )
        assert_frame_equal(df_new, df_expected)

    def test_add_column_string_split(self):
        df = pd.DataFrame(
            [
                ['Street1, Long Beach, CA, '],
                ['Street2,Vernon, CA, 123'],
                ['Pacific Coast Highway, Los Angeles, CA, 111'],
            ],
            columns=[
                'location',
            ],
        )
        action = dict(
            action_arguments=['location'],
            action_options={
                'udf': 'string_split',
                'separator': ',',
                'part_index': 1,
            },
            outputs=[
                dict(
                    uuid='location_city',
                    column_type='text',
                ),
            ],
        )
        action2 = dict(
            action_arguments=['location'],
            action_options={
                'udf': 'string_split',
                'separator': ',',
                'part_index': 3,
            },
            outputs=[
                dict(
                    uuid='num',
                    column_type='number',
                ),
            ],
        )
        df_new = add_column(add_column(df, action), action2)
        df_expected = pd.DataFrame(
            [
                ['Street1, Long Beach, CA, ', 'Long Beach', 0],
                ['Street2,Vernon, CA, 123', 'Vernon', 123],
                ['Pacific Coast Highway, Los Angeles, CA, 111', 'Los Angeles', 111],
            ],
            columns=[
                'location',
                'location_city',
                'num',
            ],
        )
        assert_frame_equal(df_new, df_expected)

    def test_add_column_substring(self):
        df = pd.DataFrame(
            [
                ['$1000.0'],
                ['$321.9'],
            ],
            columns=[
                'amount',
            ],
        )
        action = dict(
            action_arguments=['amount'],
            action_options={
                'udf': 'substring',
                'start': 1,
                'stop': -2,
            },
            outputs=[
                dict(
                    uuid='amount_int',
                    column_type='text',
                ),
            ],
        )
        df_new = add_column(df, action)
        df_expected = pd.DataFrame(
            [
                ['$1000.0', '1000'],
                ['$321.9', '321'],
            ],
            columns=[
                'amount',
                'amount_int',
            ],
        )
        assert_frame_equal(df_new, df_expected)

    def test_average(self):
        from mage_ai.data_cleaner.transformer_actions.column import average

        action = self.__groupby_agg_action('average_amount')
        df_new = average(TEST_DATAFRAME.copy(), action)
        df_expected = pd.DataFrame(
            [
                [1, 1000, 1050],
                [2, 1050, 1100],
                [1, 1100, 1050],
                [2, 1150, 1100],
            ],
            columns=['group_id', 'amount', 'average_amount'],
        )
        df_new['average_amount'] = df_new['average_amount'].astype(int)
        assert_frame_equal(df_new, df_expected)

    def test_count(self):
        df = pd.DataFrame(
            [
                [1, 1000],
                [1, 1050],
                [1, 1100],
                [2, 1150],
            ],
            columns=[
                'group_id',
                'order_id',
            ],
        )
        action = dict(
            action_arguments=['order_id'],
            action_options=dict(groupby_columns=['group_id']),
            outputs=[
                dict(uuid='order_count'),
            ],
        )
        df_new = count(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    group_id=1,
                    order_id=1000,
                    order_count=3,
                ),
                dict(
                    group_id=1,
                    order_id=1050,
                    order_count=3,
                ),
                dict(
                    group_id=1,
                    order_id=1100,
                    order_count=3,
                ),
                dict(
                    group_id=2,
                    order_id=1150,
                    order_count=1,
                ),
            ],
        )

    def test_count_distinct(self):
        df = pd.DataFrame(
            [
                [1, 1000],
                [1, 1000],
                [1, 1100],
                [2, 1150],
            ],
            columns=[
                'group_id',
                'order_id',
            ],
        )
        action = dict(
            action_arguments=['order_id'],
            action_options=dict(groupby_columns=['group_id']),
            outputs=[
                dict(uuid='order_count'),
            ],
        )
        df_new = count_distinct(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    group_id=1,
                    order_id=1000,
                    order_count=2,
                ),
                dict(
                    group_id=1,
                    order_id=1000,
                    order_count=2,
                ),
                dict(
                    group_id=1,
                    order_id=1100,
                    order_count=2,
                ),
                dict(
                    group_id=2,
                    order_id=1150,
                    order_count=1,
                ),
            ],
        )

    def test_count_with_time_window(self):
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
        action = dict(
            action_arguments=['order_id'],
            action_code='',
            action_options=dict(
                groupby_columns=['group_id'],
                timestamp_feature_a='group_churned_at',
                timestamp_feature_b='order_created_at',
                window=90 * 24 * 3600,
            ),
            outputs=[
                dict(uuid='order_count'),
            ],
        )
        df_new = count(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    group_id=1,
                    order_id=1000,
                    group_churned_at='2021-10-01',
                    order_created_at='2021-09-01',
                    order_count=2,
                ),
                dict(
                    group_id=1,
                    order_id=1050,
                    group_churned_at='2021-10-01',
                    order_created_at='2021-08-01',
                    order_count=2,
                ),
                dict(
                    group_id=1,
                    order_id=1100,
                    group_churned_at='2021-10-01',
                    order_created_at='2021-01-01',
                    order_count=2,
                ),
                dict(
                    group_id=2,
                    order_id=1150,
                    group_churned_at='2021-09-01',
                    order_created_at='2021-08-01',
                    order_count=1,
                ),
            ],
        )

    def test_count_with_filter(self):
        df = pd.DataFrame(
            [
                [1, 1000, '2021-10-01', '2021-09-01'],
                [1, 1050, '2021-10-01', '2021-08-01'],
                [1, 1100, '2021-10-01', '2021-01-01'],
                [2, 1150, '2021-09-01', '2021-08-01'],
                [2, 1200, '2021-09-01', '2021-08-16'],
                [2, 1250, '2021-09-01', '2021-08-14'],
            ],
            columns=[
                'group_id',
                'order_id',
                'group_churned_at',
                'order_created_at',
            ],
        )
        action = dict(
            action_arguments=['order_id'],
            action_code='order_created_at < \'2021-08-15\'',
            action_options=dict(
                groupby_columns=['group_id'],
            ),
            outputs=[
                dict(uuid='order_count'),
            ],
        )
        df_new = count(df, action)
        df_expected = pd.DataFrame(
            [
                [1, 1000, '2021-10-01', '2021-09-01', 2],
                [1, 1050, '2021-10-01', '2021-08-01', 2],
                [1, 1100, '2021-10-01', '2021-01-01', 2],
                [2, 1150, '2021-09-01', '2021-08-01', 2],
                [2, 1200, '2021-09-01', '2021-08-16', 2],
                [2, 1250, '2021-09-01', '2021-08-14', 2],
            ],
            columns=[
                'group_id',
                'order_id',
                'group_churned_at',
                'order_created_at',
                'order_count',
            ],
        )
        assert_frame_equal(df_new, df_expected)

    def test_clean_column_name(self):
        df = pd.DataFrame(
            [['', '', '', '', '', '', '', '', '', '', '']],
            columns=[
                'good_name',
                '  Bad Case   ',
                '%@#342%34@@#342',
                ' yield  ',
                '12342   ',
                '1234.  23',
                '   true_crime',
                '@#f$%&*o$*(%^&r*$%&',
                'PascalCaseColumn',
                'camelCaseText',
                '___weird_snake_case___',
            ],
        )
        expected_df = pd.DataFrame(
            [['', '', '', '', '', '', '', '', '', '', '']],
            columns=[
                'good_name',
                'bad_case',
                'number_34234342',
                'yield_',
                'number_12342',
                '1234___23',
                'true_crime',
                'for_',
                'pascal_case_column',
                'camel_case_text',
                'weird_snake_case',
            ],
        )
        action = dict(
            action_type='clean_column_name',
            action_arguments=[
                'good_name',
                '  Bad Case   ',
                '%@#342%34@@#342',
                ' yield  ',
                '12342   ',
                '1234.  23',
                '   true_crime',
                '@#f$%&*o$*(%^&r*$%&',
                'PascalCaseColumn',
                'camelCaseText',
                '___weird_snake_case___',
            ],
            action_code='',
            action_options={},
            action_variables={},
            axis='column',
            outputs=[],
        )
        new_df = clean_column_names(df, action)
        assert_frame_equal(new_df, expected_df)

    def test_diff(self):
        df = pd.DataFrame(
            [
                ['2020-01-01', 1000],
                ['2020-01-02', 1050],
                ['2020-01-03', 1200],
                ['2020-01-04', 990],
            ],
            columns=[
                'date',
                'sold',
            ],
        )
        action = dict(
            action_arguments=['sold'],
            outputs=[
                dict(uuid='sold_diff'),
            ],
        )
        df_new = diff(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records')[1:],
            [
                dict(
                    date='2020-01-02',
                    sold=1050,
                    sold_diff=50,
                ),
                dict(
                    date='2020-01-03',
                    sold=1200,
                    sold_diff=150,
                ),
                dict(
                    date='2020-01-04',
                    sold=990,
                    sold_diff=-210,
                ),
            ],
        )

    # def test_expand_column(self):
    #     df = pd.DataFrame([
    #         [1, 'game'],
    #         [1, 'book'],
    #         [1, 'game'],
    #         [2, 'Video Game'],
    #         [1, 'Video Game'],
    #         [2, 'book'],
    #         [1, 'Video Game'],
    #         [2, 'Video Game'],
    #     ], columns=[
    #         'group_id',
    #         'category',
    #     ])
    #     action = dict(
    #         action_arguments=['category'],
    #         action_options=dict(
    #             groupby_columns=['group_id']
    #         ),
    #         outputs=[
    #             dict(uuid='category_expanded_count_game'),
    #             dict(uuid='category_expanded_count_book'),
    #             dict(uuid='category_expanded_count_video_game'),
    #             dict(uuid='category_expanded_count_clothing'),
    #         ],
    #     )
    #     df_new = expand_column(df, action)
    #     df_expected = pd.DataFrame([
    #         [1, 'game', 2, 1, 2],
    #         [1, 'book', 2, 1, 2],
    #         [1, 'game', 2, 1, 2],
    #         [2, 'Video Game', 0, 1, 2],
    #         [1, 'Video Game', 2, 1, 2],
    #         [2, 'book', 0, 1, 2],
    #         [1, 'Video Game', 2, 1, 2],
    #         [2, 'Video Game', 0, 1, 2],
    #     ], columns=[
    #         'group_id',
    #         'category',
    #         'category_expanded_count_game',
    #         'category_expanded_count_book',
    #         'category_expanded_count_video_game',
    #     ])
    #     assert_frame_equal(df_new, df_expected)

    # def test_expand_column_with_time_window(self):
    #     df = pd.DataFrame([
    #         [1, 'game', '2021-01-02', '2021-01-04'],
    #         [1, 'book', '2021-01-02', '2021-01-04'],
    #         [1, 'game', '2021-01-03', '2021-01-04'],
    #         [2, 'Video Game', '2021-01-01', '2021-01-03'],
    #         [1, 'Video Game', '2021-01-01', '2021-01-04'],
    #         [2, 'book', '2021-01-02', '2021-01-03'],
    #         [1, 'Video Game', '2021-01-03', '2021-01-04'],
    #         [2, 'Video Game', '2020-12-30', '2021-01-03'],
    #     ], columns=[
    #         'group_id',
    #         'category',
    #         'timestamp1',
    #         'timestamp2',
    #     ])
    #     action = dict(
    #         action_arguments=['category'],
    #         action_options=dict(
    #             groupby_columns=['group_id'],
    #             timestamp_feature_a='timestamp2',
    #             timestamp_feature_b='timestamp1',
    #             window=172800,
    #         ),
    #         outputs=[
    #             dict(uuid='category_expanded_count_game_2d'),
    #             dict(uuid='category_expanded_count_book_2d'),
    #             dict(uuid='category_expanded_count_video_game_2d'),
    #             dict(uuid='category_expanded_count_clothing_2d'),
    #         ],
    #     )
    #     df_new = expand_column(df, action)
    #     df_expected = pd.DataFrame([
    #         [1, 'game', '2021-01-02', '2021-01-04', 2, 1, 1],
    #         [1, 'book', '2021-01-02', '2021-01-04', 2, 1, 1],
    #         [1, 'game', '2021-01-03', '2021-01-04', 2, 1, 1],
    #         [2, 'Video Game', '2021-01-01', '2021-01-03', 0, 1, 1],
    #         [1, 'Video Game', '2021-01-01', '2021-01-04', 2, 1, 1],
    #         [2, 'book', '2021-01-02', '2021-01-03', 0, 1, 1],
    #         [1, 'Video Game', '2021-01-03', '2021-01-04', 2, 1, 1],
    #         [2, 'Video Game', '2020-12-30', '2021-01-03', 0, 1, 1],
    #     ], columns=[
    #         'group_id',
    #         'category',
    #         'timestamp1',
    #         'timestamp2',
    #         'category_expanded_count_game_2d',
    #         'category_expanded_count_book_2d',
    #         'category_expanded_count_video_game_2d',
    #     ])
    #     assert_frame_equal(df_new, df_expected)

    def test_first_column(self):
        df = pd.DataFrame(
            [
                [1, 1000],
                [2, 1050],
                [1, 1100],
                [2, 1150],
            ],
            columns=[
                'group_id',
                'order_id',
            ],
        )
        action = dict(
            action_arguments=['order_id'],
            action_options=dict(groupby_columns=['group_id']),
            outputs=[
                dict(uuid='first_order'),
            ],
        )
        df_new = first(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    group_id=1,
                    order_id=1000,
                    first_order=1000,
                ),
                dict(
                    group_id=2,
                    order_id=1050,
                    first_order=1050,
                ),
                dict(
                    group_id=1,
                    order_id=1100,
                    first_order=1000,
                ),
                dict(
                    group_id=2,
                    order_id=1150,
                    first_order=1050,
                ),
            ],
        )

    def test_fix_syntax_errors(self):
        df = pd.DataFrame(
            [
                [
                    '-12.3%',
                    1000,
                    '11111',
                    'email@maile.com',
                    '12223334444',
                    '12/13/2014',
                    dt(2022, 6, 27),
                ],
                [
                    '$2.234',
                    1050,
                    '2222-2222',
                    'er34ee@int.co',
                    ' 1(000)-111-2222',
                    'not a time',
                    dt(2022, 6, 27),
                ],
                [
                    'eieio',
                    np.nan,
                    '09876',
                    None,
                    '12345678901234',
                    '4/27/2019 12:34:45',
                    dt(2022, 6, 27),
                ],
                ['-4', 1150, None, 'email@email@email.com', 'qqqqqqqqqqq', None, dt(2022, 6, 27)],
                [
                    'not a number',
                    1150,
                    '23423932423',
                    'eeeeeeeee',
                    '1234',
                    '12-24-2022',
                    dt(2022, 6, 27),
                ],
                [
                    None,
                    1150,
                    '234.3324',
                    'agoodemail@network.net',
                    '43213240089',
                    'is not time',
                    dt(2022, 6, 27),
                ],
            ],
            columns=[
                'number',
                'number_but_correct_type',
                'zipcode',
                'email',
                'phone_number',
                'date',
                'date_but_correct_type',
            ],
        )
        action = dict(
            action_arguments=[
                'number',
                'number_but_correct_type',
                'zipcode',
                'email',
                'phone_number',
                'date',
                'date_but_correct_type',
            ],
            action_variables=dict(
                number=dict(feature=dict(column_type='number', uuid='number'), type='feature'),
                number_but_correct_type=dict(
                    feature=dict(column_type='number', uuid='number_but_correct_type'),
                    type='feature',
                ),
                zipcode=dict(feature=dict(column_type='zip_code', uuid='zipcode'), type='feature'),
                email=dict(feature=dict(column_type='email', uuid='email'), type='feature'),
                phone_number=dict(
                    feature=dict(column_type='phone_number', uuid='phone_number'),
                    type='feature',
                ),
                date=dict(feature=dict(column_type='datetime', uuid='date'), type='feature'),
                date_but_correct_type=dict(
                    feature=dict(column_type='datetime', uuid='date_but_correct_type'),
                    type='feature',
                ),
            ),
        )
        new_df = fix_syntax_errors(df, action)
        expected_df = pd.DataFrame(
            [
                [
                    '-12.3%',
                    1000,
                    '11111',
                    'email@maile.com',
                    '12223334444',
                    '12/13/2014',
                    dt(2022, 6, 27),
                ],
                [
                    '$2.234',
                    1050,
                    '2222-2222',
                    'er34ee@int.co',
                    ' 1(000)-111-2222',
                    pd.NaT,
                    dt(2022, 6, 27),
                ],
                [
                    np.nan,
                    np.nan,
                    '09876',
                    None,
                    'invalid',
                    '4/27/2019 12:34:45',
                    dt(2022, 6, 27),
                ],
                ['-4', 1150, None, 'invalid', 'invalid', None, dt(2022, 6, 27)],
                [
                    np.nan,
                    1150,
                    'invalid',
                    'invalid',
                    'invalid',
                    '12-24-2022',
                    dt(2022, 6, 27),
                ],
                [
                    None,
                    1150,
                    'invalid',
                    'agoodemail@network.net',
                    '43213240089',
                    pd.NaT,
                    dt(2022, 6, 27),
                ],
            ],
            columns=[
                'number',
                'number_but_correct_type',
                'zipcode',
                'email',
                'phone_number',
                'date',
                'date_but_correct_type',
            ],
        )
        assert_frame_equal(new_df, expected_df)

    def test_impute(self):
        from mage_ai.data_cleaner.transformer_actions.column import impute

        df = pd.DataFrame(
            [
                ['2020-01-01', 1000, '       ', 800],
                ['2020-01-03', '', 1200, 700],
                ['2020-01-05', 1200, np.NaN, 900],
                ['2020-01-02', np.NaN, '  ', 700],
                ['2020-01-04', 1700, 1300, 800],
            ],
            columns=[
                'date',
                'sold',
                'curr_profit',
                'prev_sold',
            ],
        )
        action1 = dict(
            action_arguments=['sold', 'curr_profit'],
            action_options={
                'value': '0',
            },
            action_variables={
                'sold': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'sold',
                    },
                    'type': 'feature',
                },
                'curr_profit': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'curr_profit',
                    },
                    'type': 'feature',
                },
            },
        )
        action2 = dict(
            action_arguments=['sold'],
            action_options={
                'value': '0',
            },
            action_variables={
                'sold': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'sold',
                    },
                    'type': 'feature',
                },
                'curr_profit': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'curr_profit',
                    },
                    'type': 'feature',
                },
            },
        )
        action3 = dict(
            action_arguments=['sold', 'curr_profit'],
            action_options={
                'strategy': 'average',
            },
            action_variables={
                'sold': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'sold',
                    },
                    'type': 'feature',
                },
                'curr_profit': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'curr_profit',
                    },
                    'type': 'feature',
                },
            },
        )
        action4 = dict(
            action_arguments=['sold', 'curr_profit'],
            action_options={
                'strategy': 'median',
            },
            action_variables={
                'sold': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'sold',
                    },
                    'type': 'feature',
                },
                'curr_profit': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'curr_profit',
                    },
                    'type': 'feature',
                },
            },
        )
        action5 = dict(
            action_arguments=['sold', 'curr_profit'],
            action_options={
                'strategy': 'column',
                'value': 'prev_sold',
            },
            action_variables={
                'sold': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'sold',
                    },
                    'type': 'feature',
                },
                'curr_profit': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'curr_profit',
                    },
                    'type': 'feature',
                },
            },
        )
        action6 = dict(
            action_arguments=['sold', 'curr_profit'],
            action_options={'strategy': 'sequential', 'timeseries_index': ['date']},
            action_variables={
                'sold': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'sold',
                    },
                    'type': 'feature',
                },
                'curr_profit': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'curr_profit',
                    },
                    'type': 'feature',
                },
            },
        )
        action7 = dict(
            action_arguments=['sold', 'curr_profit'],
            action_options={'strategy': 'random'},
            action_variables={
                'sold': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'sold',
                    },
                    'type': 'feature',
                },
                'curr_profit': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'curr_profit',
                    },
                    'type': 'feature',
                },
            },
        )
        action8 = dict(
            action_arguments=['sold', 'curr_profit'],
            action_options={'strategy': 'mode'},
            action_variables={
                'sold': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'sold',
                    },
                    'type': 'feature',
                },
                'curr_profit': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'curr_profit',
                    },
                    'type': 'feature',
                },
            },
        )
        action_invalid = dict(
            action_arguments=['sold', 'curr_profit'],
            action_options={
                'strategy': 'knn',
            },
            action_variables={
                'sold': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'sold',
                    },
                    'type': 'feature',
                },
                'curr_profit': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'curr_profit',
                    },
                    'type': 'feature',
                },
            },
        )
        df_new1 = impute(df.copy(), action1)
        df_new2 = impute(df.copy(), action2)
        df_new3 = impute(df.copy(), action3)
        df_new4 = impute(df.copy(), action4)
        df_new5 = impute(df.copy(), action5)
        df_new6 = impute(df.copy(), action6).reset_index(drop=True)
        df_new7 = impute(df.copy(), action7)
        df_new8 = impute(df.copy(), action8)

        df_expected1 = pd.DataFrame(
            [
                ['2020-01-01', 1000, 0, 800],
                ['2020-01-03', 0, 1200, 700],
                ['2020-01-05', 1200, 0, 900],
                ['2020-01-02', 0, 0, 700],
                ['2020-01-04', 1700, 1300, 800],
            ],
            columns=[
                'date',
                'sold',
                'curr_profit',
                'prev_sold',
            ],
        )
        df_expected2 = pd.DataFrame(
            [
                ['2020-01-01', 1000, '       ', 800],
                ['2020-01-03', 0, 1200, 700],
                ['2020-01-05', 1200, np.nan, 900],
                ['2020-01-02', 0, '  ', 700],
                ['2020-01-04', 1700, 1300, 800],
            ],
            columns=[
                'date',
                'sold',
                'curr_profit',
                'prev_sold',
            ],
        )
        df_expected3 = pd.DataFrame(
            [
                ['2020-01-01', 1000, 1250, 800],
                ['2020-01-03', 1300, 1200, 700],
                ['2020-01-05', 1200, 1250, 900],
                ['2020-01-02', 1300, 1250, 700],
                ['2020-01-04', 1700, 1300, 800],
            ],
            columns=[
                'date',
                'sold',
                'curr_profit',
                'prev_sold',
            ],
        )
        df_expected4 = pd.DataFrame(
            [
                ['2020-01-01', 1000, 1250, 800],
                ['2020-01-03', 1200, 1200, 700],
                ['2020-01-05', 1200, 1250, 900],
                ['2020-01-02', 1200, 1250, 700],
                ['2020-01-04', 1700, 1300, 800],
            ],
            columns=[
                'date',
                'sold',
                'curr_profit',
                'prev_sold',
            ],
        )
        df_expected5 = pd.DataFrame(
            [
                ['2020-01-01', 1000, 800, 800],
                ['2020-01-03', 700, 1200, 700],
                ['2020-01-05', 1200, 900, 900],
                ['2020-01-02', 700, 700, 700],
                ['2020-01-04', 1700, 1300, 800],
            ],
            columns=[
                'date',
                'sold',
                'curr_profit',
                'prev_sold',
            ],
        )
        df_expected6 = pd.DataFrame(
            [
                ['2020-01-01', 1000, 0, 800],
                ['2020-01-02', 1000, 0, 700],
                ['2020-01-03', 1000, 1200, 700],
                ['2020-01-04', 1700, 1300, 800],
                ['2020-01-05', 1200, 1300, 900],
            ],
            columns=[
                'date',
                'sold',
                'curr_profit',
                'prev_sold',
            ],
        )
        df_expected8 = pd.DataFrame(
            [
                ['2020-01-01', 1000, 1200, 800],
                ['2020-01-03', 1000, 1200, 700],
                ['2020-01-05', 1200, 1200, 900],
                ['2020-01-02', 1000, 1200, 700],
                ['2020-01-04', 1700, 1300, 800],
            ],
            columns=[
                'date',
                'sold',
                'curr_profit',
                'prev_sold',
            ],
        )

        df_new1['sold'] = df_new1['sold'].astype(int)
        df_new1['curr_profit'] = df_new1['curr_profit'].astype(int)
        df_new2['sold'] = df_new2['sold'].astype(int)
        df_new3['sold'] = df_new3['sold'].astype(int)
        df_new3['curr_profit'] = df_new3['curr_profit'].astype(int)
        df_new4['sold'] = df_new4['sold'].astype(int)
        df_new4['curr_profit'] = df_new4['curr_profit'].astype(int)
        df_new5['sold'] = df_new5['sold'].astype(int)
        df_new5['curr_profit'] = df_new5['curr_profit'].astype(int)
        df_new6['sold'] = df_new6['sold'].astype(int)
        df_new7['sold'] = df_new7['sold'].astype(int)
        df_new7['curr_profit'] = df_new7['curr_profit'].astype(int)
        df_new8['sold'] = df_new8['sold'].astype(int)
        df_new8['curr_profit'] = df_new8['curr_profit'].astype(int)

        assert_frame_equal(df_new1, df_expected1)
        assert_frame_equal(df_new2, df_expected2)
        assert_frame_equal(df_new3, df_expected3)
        assert_frame_equal(df_new4, df_expected4)
        assert_frame_equal(df_new5, df_expected5)
        assert_frame_equal(df_new6, df_expected6)
        assert_frame_equal(df_new7, df_new7.dropna(axis=0))
        assert_frame_equal(df_new8, df_expected8)

        with self.assertRaises(Exception):
            _ = impute(df.copy(), action_invalid)

    def test_impute_random_edge(self):
        from mage_ai.data_cleaner.transformer_actions.column import impute

        df = pd.DataFrame(
            [
                ['2020-01-01', 1000, '       ', 800],
                ['2020-01-02', '', None, 700],
                ['2020-01-03', 1200, np.NaN, 900],
                ['2020-01-04', np.NaN, '  ', 700],
                ['2020-01-05', 1700, np.NaN, 800],
            ],
            columns=[
                'date',
                'sold',
                'curr_profit',
                'prev_sold',
            ],
        )
        action = dict(
            action_arguments=['sold', 'curr_profit'],
            action_options={'strategy': 'random'},
        )
        with self.assertRaises(Exception):
            _ = impute(df.copy(), action)

    def test_impute_constant(self):
        from mage_ai.data_cleaner.transformer_actions.column import impute

        df = pd.DataFrame(
            [
                [1, 1.000, '2021-10-01', 'Store 1', 23023],
                [1, None, '2021-10-01', 'Store 2', np.nan],
                [np.nan, 1100, '', '', 90233],
                [2, None, None, 'Store 1', 23920],
                [2, 12.00, '2021-09-01', None, np.nan],
                [2, 125.0, '2021-09-01', 'Store 3', 49833],
            ],
            columns=[
                'group_id',
                'price',
                'group_churned_at',
                'store',
                'zip_code',
            ],
        )
        action = dict(
            action_arguments=['group_id', 'price', 'group_churned_at', 'store', 'zip_code'],
            action_options={
                'strategy': 'constant',
            },
            action_variables={
                'group_id': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'group_id',
                    },
                    'type': 'feature',
                },
                'price': {
                    'feature': {
                        'column_type': 'number_with_decimals',
                        'uuid': 'price',
                    },
                    'type': 'feature',
                },
                'group_churned_at': {
                    'feature': {
                        'column_type': 'datetime',
                        'uuid': 'group_churned_at',
                    },
                    'type': 'feature',
                },
                'store': {
                    'feature': {
                        'column_type': 'category',
                        'uuid': 'store',
                    },
                    'type': 'feature',
                },
                'zip_code': {
                    'feature': {
                        'column_type': 'zip_code',
                        'uuid': 'zip_code',
                    },
                    'type': 'feature',
                },
            },
        )
        df_expected = pd.DataFrame(
            [
                [1, 1.000, '2021-10-01', 'Store 1', 23023],
                [1, 0.0, '2021-10-01', 'Store 2', 'missing'],
                [0, 1100, pd.Timestamp.min, 'missing', 90233],
                [2, 0.0, pd.Timestamp.min, 'Store 1', 23920],
                [2, 12.00, '2021-09-01', 'missing', 'missing'],
                [2, 125.0, '2021-09-01', 'Store 3', 49833],
            ],
            columns=[
                'group_id',
                'price',
                'group_churned_at',
                'store',
                'zip_code',
            ],
        )
        df_new = impute(df, action).reset_index(drop=True)
        df_new['group_id'] = df_new['group_id'].astype(int)
        df_new['price'] = df_new['price'].astype(float)
        df_new['group_churned_at'] = df_new['group_churned_at'].astype(np.datetime64)
        assert_frame_equal(df_new, df_expected)

    def test_impute_constant_with_value(self):
        from mage_ai.data_cleaner.transformer_actions.column import impute

        df = pd.DataFrame(
            [
                [1, 1.000, '2021-10-01', 'Store 1', 23023],
                [1, None, '2021-10-01', 'Store 2', np.nan],
                [np.nan, 1100, '', '', 90233],
                [2, None, None, 'Store 1', 23920],
                [2, 12.00, '2021-09-01', None, np.nan],
                [2, 125.0, '2021-09-01', 'Store 3', 49833],
            ],
            columns=[
                'group_id',
                'price',
                'group_churned_at',
                'store',
                'zip_code',
            ],
        )
        action = dict(
            action_arguments=['group_id', 'price', 'group_churned_at', 'store', 'zip_code'],
            action_options={'strategy': 'constant', 'value': 0},
            action_variables={
                'group_id': {
                    'feature': {'column_type': 'number', 'uuid': 'group_id'},
                    'type': 'feature',
                },
                'price': {
                    'feature': {'column_type': 'number_with_decimals', 'uuid': 'price'},
                    'type': 'feature',
                },
                'group_churned_at': {
                    'feature': {'column_type': 'datetime', 'uuid': 'group_churned_at'},
                    'type': 'feature',
                },
                'store': {
                    'feature': {'column_type': 'category', 'uuid': 'store'},
                    'type': 'feature',
                },
                'zip_code': {
                    'feature': {'column_type': 'zip_code', 'uuid': 'zip_code'},
                    'type': 'feature',
                },
            },
        )
        df_expected = pd.DataFrame(
            [
                [1, 1.000, '2021-10-01', 'Store 1', 23023],
                [1, 0, '2021-10-01', 'Store 2', 0],
                [0, 1100, 0, 0, 90233],
                [2, 0, 0, 'Store 1', 23920],
                [2, 12.00, '2021-09-01', 0, 0],
                [2, 125.0, '2021-09-01', 'Store 3', 49833],
            ],
            columns=[
                'group_id',
                'price',
                'group_churned_at',
                'store',
                'zip_code',
            ],
        )
        df_new = impute(df, action).reset_index(drop=True)
        df_new['zip_code'] = df_new['zip_code'].astype(int)
        assert_frame_equal(df_new, df_expected)

    def test_impute_sequential_two_idx(self):
        from mage_ai.data_cleaner.transformer_actions.column import impute

        df = pd.DataFrame(
            [
                [1, 1000, '2021-10-01', '2021-09-01', 2],
                [1, None, '2021-10-01', '2021-08-01', np.nan],
                [np.nan, 1100, '2021-10-01', '2021-01-01', 2],
                [2, None, '2021-09-01', '2021-08-01', 2],
                [2, 1200, '2021-09-01', '2021-08-16', np.nan],
                [2, 1250, '2021-09-01', '2021-08-14', 2],
            ],
            columns=[
                'group_id',
                'order_id',
                'group_churned_at',
                'order_created_at',
                'order_count',
            ],
        )
        action = dict(
            action_arguments=['group_id', 'order_id', 'order_count'],
            action_options={
                'strategy': 'sequential',
                'timeseries_index': ['group_churned_at', 'order_created_at'],
            },
            action_variables={
                'group_id': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'group_id',
                    },
                    'type': 'feature',
                },
                'order_id': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'order_id',
                    },
                    'type': 'feature',
                },
                'group_churned_at': {
                    'feature': {
                        'column_type': 'datetime',
                        'uuid': 'group_churned_at',
                    },
                    'type': 'feature',
                },
                'order_created_at': {
                    'feature': {
                        'column_type': 'datetime',
                        'uuid': 'order_created_at',
                    },
                    'type': 'feature',
                },
                'order_count': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'order_count',
                    },
                    'type': 'feature',
                },
            },
        )
        df_expected = pd.DataFrame(
            [
                [2, 0, '2021-09-01', '2021-08-01', 2],
                [2, 1250, '2021-09-01', '2021-08-14', 2],
                [2, 1200, '2021-09-01', '2021-08-16', 2],
                [2, 1100, '2021-10-01', '2021-01-01', 2],
                [1, 1100, '2021-10-01', '2021-08-01', 2],
                [1, 1000, '2021-10-01', '2021-09-01', 2],
            ],
            columns=[
                'group_id',
                'order_id',
                'group_churned_at',
                'order_created_at',
                'order_count',
            ],
        )
        df_new = impute(df, action).reset_index(drop=True)
        df_new['group_id'] = df_new['group_id'].astype(int)
        df_new['order_count'] = df_new['order_count'].astype(int)
        assert_frame_equal(df_new, df_expected)

    def test_impute_lists(self):
        from mage_ai.data_cleaner.transformer_actions.column import impute

        df = pd.DataFrame(
            {
                'lists': [
                    ['this', 'is', 'a', 'list', 'of', 'strings'],
                    ['this', 'is', 'a', 'list', 'of', 'strings'],
                    ['this', 'is', 'a', 'list', 'of', 'strings'],
                    None,
                ],
                'lists2': [
                    [2, 1, 3, 4, 2, 1, 2, 2],
                    [8, 9, 6, 4, 6, 4, 5, 4, 3, 4],
                    [],
                    [2, 3, 4, 1, 2],
                ],
                'lists3': [
                    None,
                    [True, False, True, True],
                    [False, True, False, True],
                    [True, True, True, False],
                ],
                'lists4': [
                    [2, 'string', False, None],
                    [np.nan, 2.0, 'string', '3'],
                    ['not string?', True, True, 8, False, np.nan, None],
                    [],
                ],
                'tuples': [
                    (2, 'string', False, None),
                    (np.nan, 2.0, 'string', '3'),
                    ('not string?', True, True, 8, False, np.nan, None),
                    tuple(),
                ],
                'string_lists': [
                    '[2, \'string\', False, None]',
                    None,
                    '[\'not string?\'   ,  True, True , 8   , False  , np.nan, None]',
                    '[]',
                ],
                'string_tuples': [
                    '(2, \'string\', False, None)',
                    '(np.nan, 2.0, \'string\', \'3\')',
                    '(\'not string?\', True, True, 8, False, np.nan, None)',
                    None,
                ],
                'not_a_list': [
                    '3',
                    '4',
                    None,
                    'a very long piece of text',
                ],
            }
        )

        # action_mode = dict(
        #     action_arguments=[
        #         'lists',
        #         'lists2',
        #         'lists3',
        #         'lists4',
        #         'tuples',
        #         'string_lists',
        #         'string_tuples',
        #         'not_a_list',
        #     ],
        #     action_options={'strategy': 'mode'},
        #     action_variables=dict(
        #         lists=dict(feature=dict(column_type='list', uuid='lists'), type='feature'),
        #         lists2=dict(feature=dict(column_type='list', uuid='lists2'), type='feature'),
        #         lists3=dict(feature=dict(column_type='list', uuid='lists3'), type='feature'),
        #         lists4=dict(feature=dict(column_type='list', uuid='lists4'), type='feature'),
        #         tuples=dict(feature=dict(column_type='list', uuid='tuples'), type='feature'),
        #         string_lists=dict(
        #             feature=dict(column_type='list', uuid='string_lists'), type='feature'
        #         ),
        #         string_tuples=dict(
        #             feature=dict(column_type='list', uuid='string_tuples'), type='feature'
        #         ),
        #         not_a_list=dict(
        #             feature=dict(column_type='text', uuid='not_a_list'), type='feature'
        #         ),
        #     ),
        # )
        action_constant = dict(
            action_arguments=[
                'lists',
                'lists2',
                'lists3',
                'lists4',
                'tuples',
                'string_lists',
                'string_tuples',
                'not_a_list',
            ],
            action_options={'strategy': 'constant'},
            action_variables=dict(
                lists=dict(feature=dict(column_type='list', uuid='lists'), type='feature'),
                lists2=dict(feature=dict(column_type='list', uuid='lists2'), type='feature'),
                lists3=dict(feature=dict(column_type='list', uuid='lists3'), type='feature'),
                lists4=dict(feature=dict(column_type='list', uuid='lists4'), type='feature'),
                tuples=dict(feature=dict(column_type='list', uuid='tuples'), type='feature'),
                string_lists=dict(
                    feature=dict(column_type='list', uuid='string_lists'), type='feature'
                ),
                string_tuples=dict(
                    feature=dict(column_type='list', uuid='string_tuples'), type='feature'
                ),
                not_a_list=dict(
                    feature=dict(column_type='text', uuid='not_a_list'), type='feature'
                ),
            ),
        )
        # expected_df_mode = pd.DataFrame(
        #     {
        #         'lists': [
        #             ['this', 'is', 'a', 'list', 'of', 'strings'],
        #             ['this', 'is', 'a', 'list', 'of', 'strings'],
        #             ['this', 'is', 'a', 'list', 'of', 'strings'],
        #             ['this', 'is', 'a', 'list', 'of', 'strings'],
        #         ],
        #         'lists2': [
        #             [2, 1, 3, 4, 2, 1, 2, 2],
        #             [8, 9, 6, 4, 6, 4, 5, 4, 3, 4],
        #             [],
        #             [2, 3, 4, 1, 2],
        #         ],
        #         'lists3': [
        #             [False, True, False, True],
        #             [True, False, True, True],
        #             [False, True, False, True],
        #             [True, True, True, False],
        #         ],
        #         'lists4': [
        #             [2, 'string', False, None],
        #             [np.nan, 2.0, 'string', '3'],
        #             ['not string?', True, True, 8, False, np.nan, None],
        #             [],
        #         ],
        #         'tuples': [
        #             (2, 'string', False, None),
        #             (np.nan, 2.0, 'string', '3'),
        #             ('not string?', True, True, 8, False, np.nan, None),
        #             tuple(),
        #         ],
        #         'string_lists': [
        #             [2, 'string', False, None],
        #             ['not string?', True, True, 8, False, np.nan, None],
        #             ['not string?', True, True, 8, False, np.nan, None],
        #             [],
        #         ],
        #         'string_tuples': [
        #             [2, 'string', False, None],
        #             [np.nan, 2.0, 'string', '3'],
        #             ['not string?', True, True, 8, False, np.nan, None],
        #             ['not string?', True, True, 8, False, np.nan, None],
        #         ],
        #         'not_a_list': [
        #             '3',
        #             '4',
        #             '3',
        #             'a very long piece of text',
        #         ],
        #     }
        # )
        expected_df_constant = pd.DataFrame(
            {
                'lists': [
                    ['this', 'is', 'a', 'list', 'of', 'strings'],
                    ['this', 'is', 'a', 'list', 'of', 'strings'],
                    ['this', 'is', 'a', 'list', 'of', 'strings'],
                    [],
                ],
                'lists2': [
                    [2, 1, 3, 4, 2, 1, 2, 2],
                    [8, 9, 6, 4, 6, 4, 5, 4, 3, 4],
                    [],
                    [2, 3, 4, 1, 2],
                ],
                'lists3': [
                    [],
                    [True, False, True, True],
                    [False, True, False, True],
                    [True, True, True, False],
                ],
                'lists4': [
                    [2, 'string', False, None],
                    [np.nan, 2.0, 'string', '3'],
                    ['not string?', True, True, 8, False, np.nan, None],
                    [],
                ],
                'tuples': [
                    (2, 'string', False, None),
                    (np.nan, 2.0, 'string', '3'),
                    ('not string?', True, True, 8, False, np.nan, None),
                    tuple(),
                ],
                'string_lists': [
                    [2, 'string', False, None],
                    [],
                    ['not string?', True, True, 8, False, np.nan, None],
                    [],
                ],
                'string_tuples': [
                    [2, 'string', False, None],
                    [np.nan, 2.0, 'string', '3'],
                    ['not string?', True, True, 8, False, np.nan, None],
                    [],
                ],
                'not_a_list': [
                    '3',
                    '4',
                    'missing',
                    'a very long piece of text',
                ],
            }
        )
        # new_df_mode = impute(df.copy(), action_mode)
        new_df_constant = impute(df.copy(), action_constant)
        # assert_frame_equal(new_df_mode, expected_df_mode)
        assert_frame_equal(new_df_constant, expected_df_constant)

    def test_impute_list_seq(self):
        from mage_ai.data_cleaner.transformer_actions.column import impute

        df = pd.DataFrame(
            [
                ['CT', '06902', '12-24-2022'],
                ['NY', '10001', '12-25-2022'],
                ['CA', '', '12-28-2022'],
                [None, '', '12-30-2022'],
                ['CA', None, '12-30-2022'],
                ['MA', '12214', '12-31-2022'],
                ['PA', '', '1-2-2023'],
                ['TX', '75001', '1-2-2023'],
                ['', None, ''],
                [None, '', None],
            ],
            columns=['state', 'location', 'timestamp'],
        )
        df['lists'] = pd.Series(
            [
                (np.nan, 2.0, 'string', '3'),
                ['not string?', True, True, 8, False, np.nan, None],
                None,
                None,
                ('not string?', True, True, 8, False, np.nan, None),
                [],
                '[\'not string?\'   ,  True, True , 8   , False  , np.nan, None]',
                '(\'not string?\'   ,  True, True , 8   , False  , np.nan, None)',
                tuple(),
                None,
            ]
        )
        df['timestamp'] = pd.to_datetime(
            df['timestamp'], infer_datetime_format=True, errors='coerce'
        )
        action = dict(
            action_type='impute',
            action_arguments=['state', 'location', 'timestamp', 'lists'],
            action_options=dict(strategy='sequential', timeseries_index=['timestamp']),
            action_variables=dict(
                state=dict(feature=dict(column_type='category', uuid='state'), type='feature'),
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
        )
        expected_df = pd.DataFrame(
            [
                ['CT', '06902', '12-24-2022'],
                ['NY', '10001', '12-25-2022'],
                ['CA', '10001', '12-28-2022'],
                ['CA', '10001', '12-30-2022'],
                ['CA', '10001', '12-30-2022'],
                ['MA', '12214', '12-31-2022'],
                ['PA', '12214', '1-2-2023'],
                ['TX', '75001', '1-2-2023'],
                ['TX', '75001', '1-2-2023'],
                ['TX', '75001', '1-2-2023'],
            ],
            columns=['state', 'location', 'timestamp'],
        )
        expected_df['lists'] = pd.Series(
            [
                (np.nan, 2.0, 'string', '3'),
                ['not string?', True, True, 8, False, np.nan, None],
                ['not string?', True, True, 8, False, np.nan, None],
                ['not string?', True, True, 8, False, np.nan, None],
                ['not string?', True, True, 8, False, np.nan, None],
                [],
                ['not string?', True, True, 8, False, np.nan, None],
                ['not string?', True, True, 8, False, np.nan, None],
                [],
                [],
            ]
        )
        new_df = impute(df, action).reset_index(drop=True)
        expected_df['timestamp'] = pd.to_datetime(
            expected_df['timestamp'], infer_datetime_format=True, errors='coerce'
        )
        assert_frame_equal(expected_df, new_df)

    def test_last_column(self):
        df = pd.DataFrame(
            [
                [1, 1000],
                [2, 1050],
                [1, 1100],
                [2, 1150],
            ],
            columns=[
                'group_id',
                'order_id',
            ],
        )
        action = dict(
            action_arguments=['order_id'],
            action_options=dict(groupby_columns=['group_id']),
            outputs=[
                dict(uuid='last_order'),
            ],
        )
        df_new = last(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    group_id=1,
                    order_id=1000,
                    last_order=1100,
                ),
                dict(
                    group_id=2,
                    order_id=1050,
                    last_order=1150,
                ),
                dict(
                    group_id=1,
                    order_id=1100,
                    last_order=1100,
                ),
                dict(
                    group_id=2,
                    order_id=1150,
                    last_order=1150,
                ),
            ],
        )

    def test_max(self):
        from mage_ai.data_cleaner.transformer_actions.column import max

        action = self.__groupby_agg_action('max_amount')
        df_new = max(TEST_DATAFRAME.copy(), action)
        df_expected = pd.DataFrame(
            [
                [1, 1000, 1100],
                [2, 1050, 1150],
                [1, 1100, 1100],
                [2, 1150, 1150],
            ],
            columns=[
                'group_id',
                'amount',
                'max_amount',
            ],
        )
        assert_frame_equal(df_new, df_expected)

        action2 = dict(
            action_arguments=['amount'],
            action_options=dict(),
            outputs=[
                dict(uuid='max_amount'),
            ],
        )
        df_new2 = max(TEST_DATAFRAME.copy(), action2)
        df_expected2 = pd.DataFrame(
            [
                [1, 1000, 1150],
                [2, 1050, 1150],
                [1, 1100, 1150],
                [2, 1150, 1150],
            ],
            columns=[
                'group_id',
                'amount',
                'max_amount',
            ],
        )
        assert_frame_equal(df_new2, df_expected2)

    def test_median(self):
        from mage_ai.data_cleaner.transformer_actions.column import median

        action = self.__groupby_agg_action('median_amount')
        df = pd.DataFrame(
            [
                [1, 1000],
                [2, 1050],
                [1, 1100],
                [2, 1550],
                [2, 1150],
            ],
            columns=[
                'group_id',
                'amount',
            ],
        )
        df_new = median(df, action)
        df_new['median_amount'] = df_new['median_amount'].astype(int)
        df_expected = pd.DataFrame(
            [
                [1, 1000, 1050],
                [2, 1050, 1150],
                [1, 1100, 1050],
                [2, 1550, 1150],
                [2, 1150, 1150],
            ],
            columns=[
                'group_id',
                'amount',
                'median_amount',
            ],
        )
        assert_frame_equal(df_new, df_expected)

    def test_min(self):
        from mage_ai.data_cleaner.transformer_actions.column import min

        action = self.__groupby_agg_action('min_amount')
        df_new = min(TEST_DATAFRAME.copy(), action)
        df_expected = pd.DataFrame(
            [
                [1, 1000, 1000],
                [2, 1050, 1050],
                [1, 1100, 1000],
                [2, 1150, 1050],
            ],
            columns=[
                'group_id',
                'amount',
                'min_amount',
            ],
        )
        assert_frame_equal(df_new, df_expected)

    def test_reformat_capitalization(self):
        from mage_ai.data_cleaner.transformer_actions.column import reformat

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
        df_expected = pd.DataFrame(
            [
                [None, 'US', 30000, 'funny video corp', 'cute animal #1', 100, 30],
                ['500', 'CA', 10000, 'machine learning 4 u', 'intro to regression', 3000, 20],
                ['', None, np.nan, 'news inc', 'daily news #1', None, 75],
                ['250', 'CA', 7500, 'machine learning 4 u', 'machine learning seminar', 8000, 20],
                ['1000', 'MX', 45003, None, 'cute animal #4', 90, 40],
                ['1500', 'MX', 75000, 'funny video corp', None, 70, 25],
                ['1500', np.nan, 75000, 'news inc', 'daily news #3', 70, 25],
                [None, 'MX', 75000, 'z combinator', 'tutorial: how to start a startup', 70, np.nan],
                ['1250', 'US', 60000, 'funny video corp', 'cute animal #3', 80, 20],
                ['', 'CA', 5000, None, None, 10000, 30],
                ['800', None, 12050, 'funny video corp', 'meme compilation', 2000, 45],
                ['600', 'CA', 11000, 'news inc', 'daily news #2', 3000, 50],
                ['600', 'CA', '', 'funny video corp', None, 3000, None],
                ['700', 'MX', 11750, 'funny video corp', 'cute animal #2', 2750, 55],
                ['700', None, None, 'funny video corp', None, None, 55],
                ['700', 'MX', 11750, 'funny video corp', None, 2750, 55],
                ['1200', 'MX', 52000, 'z combinator', 'vc funding strats', 75, 60],
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
        action1 = dict(
            action_type='reformat',
            action_arguments=['location'],
            axis='column',
            action_options={'reformat': 'caps_standardization', 'capitalization': 'uppercase'},
            action_variables={
                'location': {
                    'feature': {'column_type': 'category', 'uuid': 'location'},
                    'type': 'feature',
                }
            },
            action_code='',
            outputs=[],
        )
        action2 = dict(
            action_type='reformat',
            action_arguments=['company_name', 'name'],
            axis='column',
            action_options={'reformat': 'caps_standardization', 'capitalization': 'lowercase'},
            action_variables={
                'company_name': {
                    'feature': {'column_type': 'category_high_cardinality', 'uuid': 'company_name'},
                    'type': 'feature',
                },
                'name': {'feature': {'column_type': 'text', 'uuid': 'name'}, 'type': 'feature'},
            },
            action_code='',
            outputs=[],
        )
        df_new = reformat(df, action1)
        df_new = reformat(df_new, action2)
        assert_frame_equal(df_new, df_expected)

    def test_reformat_currency(self):
        from mage_ai.data_cleaner.transformer_actions.column import reformat

        df_currency = pd.DataFrame(
            [
                ['$', '$    10000', 'stock exchange america', '$:MAGE', 5.34],
                ['£', '£200', 'huddersfield stock exchange', '£:XYZA', -1.34],
                ['CAD', 'CAD 100', None, '', -0.89],
                ['¥', '', 'stock exchange japan', '', 4.23],
                ['€', '€ 123.34', 'dresden stock exchange', '€:1234', 2.34],
                ['₹', '₹        10000', np.nan, '₹:FDSA', -7.80],
                ['Rs', 'Rs 10000', '', '₹:ASDF', 4.44],
                ['', '元10000', 'stock exchange china', '元:ASDF', 1.02],
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
        df_expected = pd.DataFrame(
            [
                ['$', 10000, 'stock exchange america', '$:MAGE', 5.34],
                ['£', 200, 'huddersfield stock exchange', '£:XYZA', -1.34],
                ['CAD', 100, None, '', -0.89],
                ['¥', np.nan, 'stock exchange japan', '', 4.23],
                ['€', 123.34, 'dresden stock exchange', '€:1234', 2.34],
                ['₹', 10000, np.nan, '₹:FDSA', -7.80],
                ['Rs', 10000, '', '₹:ASDF', 4.44],
                ['', 10000, 'stock exchange china', '元:ASDF', 1.02],
                [None, np.nan, 'stock exchange san jose', None, -2.01],
            ],
            columns=[
                'native_currency',
                'value',
                'exchange',
                'ticker',
                'growth_rate',
            ],
        )
        action_currency = dict(
            action_type='reformat',
            action_arguments=['value'],
            axis='column',
            action_options={
                'reformat': 'currency_to_num',
            },
            action_variables={
                'value': {
                    'feature': {'column_type': 'number_with_decimals', 'uuid': 'value'},
                    'type': 'feature',
                }
            },
            action_code='',
            outputs=[],
        )
        df_new = reformat(df_currency, action_currency)
        assert_frame_equal(df_new, df_expected)

    def test_currency_conversion_test_all_formatting(self):
        from mage_ai.data_cleaner.transformer_actions.column import reformat

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
        expected_values = [
            10000,
            -22.324523,
            100000.23,
            12.23425,
            12423,
            0.0927503,
            -0.0,
            10000,
            0.42,
            -3.42032,
        ]

        df = pd.DataFrame({'column': values})
        expected_df = pd.DataFrame({'column': expected_values})
        action = dict(
            action_type='reformat',
            action_arguments=['column'],
            axis='column',
            action_options={
                'reformat': 'currency_to_num',
            },
            action_variables={
                'column': {
                    'feature': {'column_type': 'number_with_decimals', 'uuid': 'column'},
                    'type': 'feature',
                }
            },
            action_code='',
            outputs=[],
        )
        new_df = reformat(df, action)
        assert_frame_equal(new_df, expected_df)

    def test_reformat_time(self):
        from mage_ai.data_cleaner.transformer_actions.column import reformat

        df = pd.DataFrame(
            [
                [dt(2022, 8, 4), None, 'Action Movie #1', 'not a date', 234],
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
        expected_df = pd.DataFrame(
            [
                [dt(2022, 8, 4), pd.NaT, 'Action Movie #1', pd.NaT, pd.to_datetime(234)],
                [
                    dt(2022, 1, 20),
                    pd.NaT,
                    'sportsball',
                    pd.to_datetime('1-20-2022'),
                    pd.to_datetime(13234),
                ],
                [
                    None,
                    pd.to_datetime('12/24/22'),
                    'reality tv show',
                    pd.to_datetime('12-24-2022'),
                    pd.to_datetime(23234),
                ],
                [
                    dt(2022, 10, 31),
                    pd.to_datetime('10/31/22'),
                    '',
                    pd.to_datetime('10.31.2022'),
                    pd.to_datetime(21432),
                ],
                [
                    dt(2022, 6, 27),
                    pd.NaT,
                    'action Movie #2',
                    pd.to_datetime('6/27/2022'),
                    pd.to_datetime(324212),
                ],
                [
                    dt(2022, 3, 8),
                    pd.to_datetime('03/08/22'),
                    'game show',
                    pd.to_datetime('3/8/2022'),
                    pd.to_datetime(2034),
                ],
            ],
            columns=[
                'date1',
                'date2',
                'notdate',
                'mostlydate',
                'date5',
            ],
        )
        action = dict(
            action_type='reformat',
            action_arguments=['date2', 'mostlydate', 'date5'],
            axis='column',
            action_options={
                'reformat': 'date_format_conversion',
            },
            action_variables={
                'date2': {
                    'feature': {'column_type': 'datetime', 'uuid': 'date2'},
                    'type': 'feature',
                },
                'mostlydate': {
                    'feature': {'column_type': 'category_high_cardinality', 'uuid': 'mostlydate'},
                    'type': 'feature',
                },
                'date5': {'feature': {'column_type': 'number', 'uuid': 'date5'}, 'type': 'feature'},
            },
            action_code='',
            outputs=[],
        )
        df_new = reformat(df, action).reset_index(drop=True)
        assert_frame_equal(df_new, expected_df)

    def test_reformat_time_bad_inputs(self):
        from mage_ai.data_cleaner.transformer_actions.column import reformat

        df = pd.DataFrame(
            [
                [dt(2022, 8, 4), '08/04/22', 'Action Movie #1', 'not a date', np.nan, True],
                [dt(2022, 1, 20), '', 'sportsball', '1-20-2022', -1323.4, False],
                [None, '12/24/22', 'reality tv show', '12-24-2022', -232342.322, False],
                [dt(2022, 10, 31), '10/31/22', '', '10.31.2022', 21.432, None],
                [dt(2022, 6, 27), None, 'action Movie #2', '6/27/2022', 324212, True],
                [dt(2022, 3, 8), '03/08/    22', 'game show', '3/8/2022', -9830, False],
            ],
            columns=['date1', 'date2', 'notdate', 'mostlydate', 'date5', 'boolean'],
        )
        expected_df = pd.DataFrame(
            [
                [dt(2022, 8, 4), pd.to_datetime('08/04/22'), pd.NaT, pd.NaT, np.nan, pd.NaT],
                [
                    dt(2022, 1, 20),
                    pd.NaT,
                    pd.NaT,
                    pd.to_datetime('1-20-2022'),
                    pd.to_datetime(-1323.4),
                    pd.NaT,
                ],
                [
                    None,
                    pd.to_datetime('12/24/22'),
                    pd.NaT,
                    pd.to_datetime('12-24-2022'),
                    pd.to_datetime(-232342.322),
                    pd.NaT,
                ],
                [
                    dt(2022, 10, 31),
                    pd.to_datetime('10/31/22'),
                    pd.NaT,
                    pd.to_datetime('10.31.2022'),
                    pd.to_datetime(21.432),
                    pd.NaT,
                ],
                [
                    dt(2022, 6, 27),
                    pd.NaT,
                    pd.NaT,
                    pd.to_datetime('6/27/2022'),
                    pd.to_datetime(324212),
                    pd.NaT,
                ],
                [
                    dt(2022, 3, 8),
                    pd.to_datetime('03/08/22'),
                    pd.NaT,
                    pd.to_datetime('3/8/2022'),
                    pd.to_datetime(-9830),
                    pd.NaT,
                ],
            ],
            columns=['date1', 'date2', 'notdate', 'mostlydate', 'date5', 'boolean'],
        )
        action = dict(
            action_type='reformat',
            action_arguments=['date1', 'date2', 'notdate', 'mostlydate', 'date5', 'boolean'],
            axis='column',
            action_options={
                'reformat': 'date_format_conversion',
            },
            action_variables={
                'date1': {
                    'feature': {'column_type': 'datetime', 'uuid': 'date1'},
                    'type': 'feature',
                },
                'date2': {
                    'feature': {'column_type': 'datetime', 'uuid': 'date2'},
                    'type': 'feature',
                },
                'notdate': {
                    'feature': {'column_type': 'text', 'uuid': 'notdate'},
                    'type': 'feature',
                },
                'mostlydate': {
                    'feature': {'column_type': 'category_high_cardinality', 'uuid': 'mostlydate'},
                    'type': 'feature',
                },
                'date5': {
                    'feature': {'column_type': 'number_with_decimals', 'uuid': 'date5'},
                    'type': 'feature',
                },
                'boolean': {
                    'feature': {'column_type': 'true_or_false', 'uuid': 'boolean'},
                    'type': 'feature',
                },
            },
            action_code='',
            outputs=[],
        )
        df_new = reformat(df, action).reset_index(drop=True)
        assert_frame_equal(df_new, expected_df)

    def test_reformat_bad_inputs(self):
        from mage_ai.data_cleaner.transformer_actions.column import reformat

        df = pd.DataFrame(
            [
                [dt(2022, 8, 4), None, 'Action Movie #1', 'not a date', 234],
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

        expected_df = pd.DataFrame(
            [
                [dt(2022, 8, 4), None, pd.NaT, pd.NaT, 234],
                [dt(2022, 1, 20), '', pd.NaT, pd.Timestamp('1-20-2022'), 13234],
                [None, '12/24/22', pd.NaT, pd.Timestamp('12-24-2022'), 23234],
                [dt(2022, 10, 31), '10/31/22', pd.NaT, pd.Timestamp('10.31.2022'), 21432],
                [dt(2022, 6, 27), None, pd.NaT, pd.Timestamp('6/27/2022'), 324212],
                [dt(2022, 3, 8), '03/08/    22', pd.NaT, pd.Timestamp('3/8/2022'), 2034],
            ],
            columns=[
                'date1',
                'date2',
                'notdate',
                'mostlydate',
                'date5',
            ],
        )

        action = dict(
            action_type='reformat',
            action_arguments=['date1', 'date5'],
            axis='column',
            action_options={'reformat': 'caps_standardization', 'capitalization': 'lowercase'},
            action_variables={},
            action_code='',
            outputs=[],
        )
        action2 = dict(
            action_type='reformat',
            action_arguments=['date1', 'date5', 'notdate', 'mostlydate'],
            axis='column',
            action_options={
                'reformat': 'currency_conversion',
            },
            action_variables={},
            action_code='',
            outputs=[],
        )
        action3 = dict(
            action_type='reformat',
            action_arguments=['notdate', 'mostlydate'],
            axis='column',
            action_options={
                'reformat': 'date_format_conversion',
            },
            action_variables={},
            action_code='',
            outputs=[],
        )
        df_new = reformat(df, action).reset_index(drop=True)
        assert_frame_equal(df_new, df)
        df_new2 = reformat(df, action2).reset_index(drop=True)
        assert_frame_equal(df_new2, df)
        df_new3 = reformat(df, action3).reset_index(drop=True)
        df_new3['notdate'] = df_new3['notdate'].astype(np.datetime64)
        df_new3['mostlydate'] = df_new3['mostlydate'].astype(np.datetime64)
        assert_frame_equal(df_new3, expected_df)

    def test_remove_outliers(self):
        from mage_ai.data_cleaner.transformer_actions.column import remove_outliers

        df = pd.DataFrame(
            [
                [1, 1, 1],
                [1, 2, 997],
                [1, 3, 998],
                [1, 4, 999],
                [1, 5, 1000],
                [1, 6, 997],
                [1, 7, 998],
                [1, 8, 999],
                [1, 9, 1000],
                [1, 10, 997],
                [1, 11, 998],
                [1, 12, 999],
            ],
            columns=['number1', 'number2', 'number3'],
        )

        expected_df = df.drop(0, axis=0)

        action_lof = dict(
            action_type='remove_outliers',
            action_arguments=['number1', 'number2', 'number3'],
            action_options={'method': 'lof'},
            action_variables={
                'number1': {
                    'feature': {'column_type': 'number', 'uuid': 'number1'},
                    'type': 'feature',
                },
                'number2': {
                    'feature': {'column_type': 'number', 'uuid': 'number2'},
                    'type': 'feature',
                },
                'number3': {
                    'feature': {'column_type': 'number', 'uuid': 'number3'},
                    'type': 'feature',
                },
            },
            axis='column',
        )

        action_itree = dict(
            action_type='remove_outliers',
            action_arguments=['number1', 'number2', 'number3'],
            action_options={'method': 'itree'},
            action_variables={
                'number1': {
                    'feature': {'column_type': 'number', 'uuid': 'number1'},
                    'type': 'feature',
                },
                'number2': {
                    'feature': {'column_type': 'number', 'uuid': 'number2'},
                    'type': 'feature',
                },
                'number3': {
                    'feature': {'column_type': 'number', 'uuid': 'number3'},
                    'type': 'feature',
                },
            },
            axis='column',
        )

        lof_df = remove_outliers(df, action_lof)
        itree_df = remove_outliers(df, action_itree)

        assert_frame_equal(expected_df, lof_df)
        assert_frame_equal(expected_df, itree_df)

    def test_remove_outliers_bad_inputs(self):
        from mage_ai.data_cleaner.transformer_actions.column import remove_outliers

        df = pd.DataFrame(
            [
                ['e', '2', 997],
                ['e', '3', np.nan],
                ['e', '4', 999],
                ['e', '5', 1000],
                ['e', '6', 997],
                ['e', None, 998],
                ['e', '8', 999],
                ['e', '9', 1000],
                ['e', '10', 997],
                ['e', '11', np.nan],
                ['e', '12', 999],
                ['e', '1', 1],
            ],
            columns=['number1', 'number2', 'number3'],
        )

        expected_df = df.drop(11, axis=0)

        action_one = dict(
            action_type='remove_outliers',
            action_arguments=['number2', 'number3'],
            action_options={'method': 'auto'},
            action_variables={
                'number1': {
                    'feature': {'column_type': 'text', 'uuid': 'number1'},
                    'type': 'feature',
                },
                'number2': {
                    'feature': {'column_type': 'number', 'uuid': 'number2'},
                    'type': 'feature',
                },
                'number3': {
                    'feature': {'column_type': 'number', 'uuid': 'number3'},
                    'type': 'feature',
                },
            },
            axis='column',
        )

        action_two = dict(
            action_type='remove_outliers',
            action_arguments=['number1', 'number3'],
            action_options={'method': 'auto'},
            action_variables={
                'number1': {
                    'feature': {'column_type': 'text', 'uuid': 'number1'},
                    'type': 'feature',
                },
                'number2': {
                    'feature': {'column_type': 'number', 'uuid': 'number2'},
                    'type': 'feature',
                },
                'number3': {
                    'feature': {'column_type': 'number', 'uuid': 'number3'},
                    'type': 'feature',
                },
            },
            axis='column',
        )

        df_one = remove_outliers(df, action_one)
        df_two = remove_outliers(df, action_two)

        assert_frame_equal(expected_df, df_one)
        assert_frame_equal(expected_df, df_two)

    def test_remove_outliers_lof(self):
        from mage_ai.data_cleaner.transformer_actions.column import remove_outliers

        """
        This test case is engineered so that only in the
        multidimensional case is a row removed as an outlier
        """
        df = pd.DataFrame(
            [
                [0, 0, -1],
                [0, 0, -2],
                [0, 0, -3],
                [0, 0, 2],
                [0, 0, 1],
                [0, 0, 3],
                [0, 0, 2],
                [0, 2, 0],
                [3, 0, 0],
                [1, 0, 0],
                [2, 0, 0],
                [3, 0, 0],
                [-2, 0, 0],
                [0, -1, 0],
                [0, 0, -2],
                [0, 2, 0],
                [0, 3, 0],
                [0, 4, 0],
                [0, 3, 0],
                [0, 2, 0],
                [-3, -2, -3],
                [0, -3, 0],
                [0, -2, 0],
                [0, -3, 0],
                [2, 2, 2],
                [0, -1, 0],
                [-1, 0, 0],
                [-3, 0, 0],
                [2, 0, 0],
                [-2, 0, 0],
            ],
            columns=['number1', 'number2', 'number3'],
        )

        expected_df = df.drop([20, 24], axis=0)

        action = dict(
            action_type='remove_outliers',
            action_arguments=['number1', 'number2', 'number3'],
            action_options={'method': 'auto'},
            action_variables={
                'number1': {
                    'feature': {'column_type': 'number', 'uuid': 'number1'},
                    'type': 'feature',
                },
                'number2': {
                    'feature': {'column_type': 'number', 'uuid': 'number2'},
                    'type': 'feature',
                },
                'number3': {
                    'feature': {'column_type': 'number', 'uuid': 'number3'},
                    'type': 'feature',
                },
            },
            axis='column',
        )

        new_df = remove_outliers(df, action)

        assert_frame_equal(new_df, expected_df)

    def test_remove_outliers_itree(self):
        from mage_ai.data_cleaner.transformer_actions.column import remove_outliers

        """
        This test case is engineered so that only in the
        multidimensional case is a row removed as an outlier
        """
        data = np.zeros((30, 7))
        col = np.random.randint(0, 6, size=(30,))
        values = np.random.randint(-3, 3, size=(30,))
        data[np.arange(30), col] = values
        data[0] = np.array([-10, 2, 4, -5, 7, 2, 3])
        data[7] = np.array([7, 3, -5, 4, 3, -9, -8])
        data[18] = np.array([-4, 5, 10, -3, -2, 2, -6])
        data[27] = np.array([-10, 3, 3, 4, 5, -9, 3])
        df = pd.DataFrame(data, columns=['1', '2', '3', '4', '5', '6', '7'])
        expected_df = df.drop([0, 7, 18, 27], axis=0)
        action = dict(
            action_type='remove_outliers',
            action_arguments=['1', '2', '3', '4', '5', '6', '7'],
            action_options={'method': 'auto'},
            action_variables={
                '1': {
                    'feature': {'column_type': 'number', 'uuid': '1'},
                    'type': 'feature',
                },
                '2': {
                    'feature': {'column_type': 'number', 'uuid': '2'},
                    'type': 'feature',
                },
                '3': {
                    'feature': {'column_type': 'number', 'uuid': '3'},
                    'type': 'feature',
                },
                '4': {
                    'feature': {'column_type': 'number', 'uuid': '4'},
                    'type': 'feature',
                },
                '5': {
                    'feature': {'column_type': 'number', 'uuid': '5'},
                    'type': 'feature',
                },
                '6': {
                    'feature': {'column_type': 'number', 'uuid': '6'},
                    'type': 'feature',
                },
                '7': {
                    'feature': {'column_type': 'number', 'uuid': '7'},
                    'type': 'feature',
                },
            },
            axis='column',
        )
        new_df = remove_outliers(df, action)
        assert_frame_equal(new_df, expected_df)

    def test_select(self):
        df = pd.DataFrame(
            [
                [1, 1000],
                [2, 1050],
            ],
            columns=[
                'group_id',
                'order_id',
            ],
        )
        action = dict(action_arguments=['group_id'])
        df_new = select(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    group_id=1,
                ),
                dict(
                    group_id=2,
                ),
            ],
        )

    def test_shift_down(self):
        df = pd.DataFrame(
            [
                ['2020-01-01', 1000],
                ['2020-01-02', 1050],
                ['2020-01-03', 1200],
                ['2020-01-04', 990],
            ],
            columns=[
                'date',
                'sold',
            ],
        )
        action = dict(
            action_arguments=['sold'],
            outputs=[
                dict(uuid='prev_sold'),
            ],
        )
        df_new = shift_down(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records')[1:],
            [
                dict(
                    date='2020-01-02',
                    sold=1050,
                    prev_sold=1000,
                ),
                dict(
                    date='2020-01-03',
                    sold=1200,
                    prev_sold=1050,
                ),
                dict(
                    date='2020-01-04',
                    sold=990,
                    prev_sold=1200,
                ),
            ],
        )

    def test_shift_down_with_groupby(self):
        df = pd.DataFrame(
            [
                [1, '2020-01-01', 1000],
                [1, '2020-01-02', 1050],
                [2, '2020-01-03', 1200],
                [1, '2020-01-04', 990],
                [2, '2020-01-05', 980],
                [2, '2020-01-06', 970],
                [2, '2020-01-07', 960],
            ],
            columns=[
                'group_id',
                'date',
                'sold',
            ],
        )
        action = dict(
            action_arguments=['sold'],
            action_options=dict(
                groupby_columns=['group_id'],
                periods=2,
            ),
            outputs=[
                dict(uuid='prev_sold'),
            ],
        )
        df_new = shift_down(df, action)
        df_expected = pd.DataFrame(
            [
                [1, '2020-01-01', 1000, None],
                [1, '2020-01-02', 1050, None],
                [2, '2020-01-03', 1200, None],
                [1, '2020-01-04', 990, 1000],
                [2, '2020-01-05', 980, None],
                [2, '2020-01-06', 970, 1200],
                [2, '2020-01-07', 960, 980],
            ],
            columns=[
                'group_id',
                'date',
                'sold',
                'prev_sold',
            ],
        )
        assert_frame_equal(df_new, df_expected)

    def test_shift_up(self):
        df = pd.DataFrame(
            [
                ['2020-01-01', 1000],
                ['2020-01-02', 1050],
                ['2020-01-03', 1200],
                ['2020-01-04', 990],
            ],
            columns=[
                'date',
                'sold',
            ],
        )
        action = dict(
            action_arguments=['sold'],
            outputs=[
                dict(uuid='next_sold'),
            ],
        )
        df_new = shift_up(df, action)
        self.assertEqual(
            df_new.to_dict(orient='records')[:-1],
            [
                dict(
                    date='2020-01-01',
                    sold=1000,
                    next_sold=1050,
                ),
                dict(
                    date='2020-01-02',
                    sold=1050,
                    next_sold=1200,
                ),
                dict(
                    date='2020-01-03',
                    sold=1200,
                    next_sold=990,
                ),
            ],
        )

    def test_sum(self):
        from mage_ai.data_cleaner.transformer_actions.column import sum

        action = self.__groupby_agg_action('total_amount')
        df_new = sum(TEST_DATAFRAME.copy(), action)
        self.assertEqual(
            df_new.to_dict(orient='records'),
            [
                dict(
                    group_id=1,
                    amount=1000,
                    total_amount=2100,
                ),
                dict(
                    group_id=2,
                    amount=1050,
                    total_amount=2200,
                ),
                dict(
                    group_id=1,
                    amount=1100,
                    total_amount=2100,
                ),
                dict(
                    group_id=2,
                    amount=1150,
                    total_amount=2200,
                ),
            ],
        )

    def __groupby_agg_action(self, output_col):
        return dict(
            action_arguments=['amount'],
            action_options=dict(groupby_columns=['group_id']),
            outputs=[
                dict(uuid=output_col),
            ],
        )
