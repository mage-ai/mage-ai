from data_cleaner.tests.base_test import TestCase
from data_cleaner.transformer_actions.column import (
    add_column,
    count,
    count_distinct,
    diff,
    # expand_column,
    first,
    last,
    remove_column,
    select,
    shift_down,
    shift_up,
)
from pandas.util.testing import assert_frame_equal
import numpy as np
import pandas as pd

TEST_DATAFRAME = pd.DataFrame([
    [1, 1000],
    [2, 1050],
    [1, 1100],
    [2, 1150],
], columns=[
    'group_id',
    'amount',
])


class ColumnTests(TestCase):
    def test_remove_column(self):
        df = pd.DataFrame([
            [0, False, 'a'],
            [1, True, 'b'],
        ], columns=[
            'integer',
            'boolean',
            'string',
        ])

        action = dict(action_arguments=['string'])

        df_new = remove_column(df, action)
        self.assertEqual(df_new.to_dict(orient='records'), [
            dict(
                integer=0,
                boolean=False,
            ),
            dict(
                integer=1,
                boolean=True,
            ),
        ])

        action = dict(action_arguments=['integer', 'boolean'])

        df_new = remove_column(df, action)
        self.assertEqual(df_new.to_dict(orient='records'), [
            dict(
                string='a',
            ),
            dict(
                string='b',
            ),
        ])

    def test_add_column_addition(self):
        df = pd.DataFrame([
            [1, 3, 7, 9],
            [4, 2, 9, 3],
        ], columns=[
            'integer1',
            'integer2',
            'integer3',
            'integer4',
        ])
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
        df_expected = pd.DataFrame([
            [1, 3, 7, 9, 11, 11, 20],
            [4, 2, 9, 3, 15, 14, 17],
        ], columns=[
            'integer1',
            'integer2',
            'integer3',
            'integer4',
            'integer_addition',
            'integer_addition2',
            'integer_addition3',
        ])
        assert_frame_equal(df_new, df_expected)

    def test_add_column_addition_days(self):
        df = pd.DataFrame([
            ['2021-08-31'],
            ['2021-08-28'],
        ], columns=[
            'created_at',
        ])
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
        df_expected = pd.DataFrame([
            ['2021-08-31', '2021-09-03 00:00:00'],
            ['2021-08-28', '2021-08-31 00:00:00'],
        ], columns=[
            'created_at',
            '3d_after_creation'
        ])
        assert_frame_equal(df_new, df_expected)

    def test_add_column_constant(self):
        df = pd.DataFrame([
            [False],
            [True],
        ], columns=[
            'boolean',
        ])
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
        self.assertEqual(df_new.to_dict(orient='records'), [
            dict(
                boolean=False,
                integer=10,
            ),
            dict(
                boolean=True,
                integer=10,
            ),
        ])

    def test_add_column_date_trunc(self):
        df = pd.DataFrame([
            ['2021-08-31', False],
            ['2021-08-28', True],
        ], columns=[
            'created_at',
            'boolean',
        ])
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
        self.assertEqual(df_new.to_dict(orient='records'), [
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
        ])

    def test_add_column_difference(self):
        df = pd.DataFrame([
            [1, 3],
            [4, 2],
        ], columns=[
            'integer1',
            'integer2',
        ])
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
        df_expected = pd.DataFrame([
            [1, 3, -2, -9],
            [4, 2, 2, -6],
        ], columns=[
            'integer1',
            'integer2',
            'integer_difference',
            'integer_difference2'
        ])
        assert_frame_equal(df_new, df_expected)

    def test_add_column_difference_days(self):
        df = pd.DataFrame([
            ['2021-08-31', '2021-09-14'],
            ['2021-08-28', '2021-09-03'],
        ], columns=[
            'created_at',
            'converted_at',
        ])
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
        df_expected = pd.DataFrame([
            ['2021-08-31', '2021-09-14', 14],
            ['2021-08-28', '2021-09-03', 6],
        ], columns=[
            'created_at',
            'converted_at',
            'days_diff',
        ])
        assert_frame_equal(df_new, df_expected)

    def test_add_column_distance_between(self):
        df = pd.DataFrame([
            [26.05308, -97.31838, 33.41939, -112.32606],
            [39.71954, -84.13056, 33.41939, -112.32606],
        ], columns=[
            'lat1',
            'lng1',
            'lat2',
            'lng2',
        ])
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
        self.assertEqual(df_new.to_dict(orient='records'), [
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
        ])

    def test_add_column_divide(self):
        df = pd.DataFrame([
            [12, 3, 70, 9],
            [4, 2, 90, 3],
        ], columns=[
            'integer1',
            'integer2',
            'integer3',
            'integer4',
        ])
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
        df_expected = pd.DataFrame([
            [12, 3, 70, 9, 4, 7],
            [4, 2, 90, 3, 2, 9],
        ], columns=[
            'integer1',
            'integer2',
            'integer3',
            'integer4',
            'integer_divide',
            'integer_divide2'
        ])
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
        df = pd.DataFrame([
            ['2019-04-10 08:20:58', False],
            ['2019-03-05 03:30:30', True],
        ], columns=[
            'created_at',
            'boolean',
        ])
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
        self.assertEqual(df_new.to_dict(orient='records'), [
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
        ])

    def test_add_column_if_else(self):
        df = pd.DataFrame([
            ['2019-04-10 08:20:58'],
            [None],
        ], columns=[
            'converted_at'
        ])
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
        self.assertEqual(df_new.to_dict(orient='records'), [
            dict(
                converted_at='2019-04-10 08:20:58',
                converted=True,
            ),
            dict(
                converted_at=None,
                converted=False,
            ),
        ])

    def test_add_column_if_else_with_column(self):
        df = pd.DataFrame([
            ['2019-04-10 08:20:58', 'test_user_id'],
            [None, None],
        ], columns=[
            'converted_at',
            'user_id',
        ])
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
        self.assertEqual(df_new.to_dict(orient='records'), [
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
        ])

    def test_add_column_multiply(self):
        df = pd.DataFrame([
            [1, 3, 7, 9],
            [4, 2, 9, 3],
        ], columns=[
            'integer1',
            'integer2',
            'integer3',
            'integer4',
        ])
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
        df_expected = pd.DataFrame([
            [1, 3, 7, 9, 3, 70],
            [4, 2, 9, 3, 8, 90],
        ], columns=[
            'integer1',
            'integer2',
            'integer3',
            'integer4',
            'integer_multiply',
            'integer_multiply2'
        ])
        assert_frame_equal(df_new, df_expected)

    def test_add_column_string_replace(self):
        df = pd.DataFrame([
            ['$1000'],
            ['$321.  '],
            ['$4,321'],
        ], columns=[
            'amount',
        ])
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
        df_expected = pd.DataFrame([
            ['$1000', '1000'],
            ['$321.  ', '321'],
            ['$4,321', '4321'],
        ], columns=[
            'amount',
            'amount_clean',
        ])
        assert_frame_equal(df_new, df_expected)

    def test_add_column_string_split(self):
        df = pd.DataFrame([
            ['Street1, Long Beach, CA, '],
            ['Street2,Vernon, CA, 123'],
            ['Pacific Coast Highway, Los Angeles, CA, 111'],
        ], columns=[
            'location',
        ])
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
        df_expected = pd.DataFrame([
            ['Street1, Long Beach, CA, ', 'Long Beach', 0],
            ['Street2,Vernon, CA, 123', 'Vernon', 123],
            ['Pacific Coast Highway, Los Angeles, CA, 111', 'Los Angeles', 111],
        ], columns=[
            'location',
            'location_city',
            'num',
        ])
        assert_frame_equal(df_new, df_expected)

    def test_add_column_substring(self):
        df = pd.DataFrame([
            ['$1000.0'],
            ['$321.9'],
        ], columns=[
            'amount',
        ])
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
        df_expected = pd.DataFrame([
            ['$1000.0', '1000'],
            ['$321.9', '321'],
        ], columns=[
            'amount',
            'amount_int',
        ])
        assert_frame_equal(df_new, df_expected)

    def test_average(self):
        from data_cleaner.transformer_actions.column import average
        action = self.__groupby_agg_action('average_amount')
        df_new = average(TEST_DATAFRAME.copy(), action)
        df_expected = pd.DataFrame([
            [1, 1000, 1050],
            [2, 1050, 1100],
            [1, 1100, 1050],
            [2, 1150, 1100],
        ], columns=[
            'group_id',
            'amount',
            'average_amount'
        ])
        assert_frame_equal(df_new, df_expected)

    def test_count(self):
        df = pd.DataFrame([
            [1, 1000],
            [1, 1050],
            [1, 1100],
            [2, 1150],
        ], columns=[
            'group_id',
            'order_id',
        ])
        action = dict(
            action_arguments=['order_id'],
            action_options=dict(
                groupby_columns=['group_id']
            ),
            outputs=[
                dict(uuid='order_count'),
            ],
        )
        df_new = count(df, action)
        self.assertEqual(df_new.to_dict(orient='records'), [
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
        ])

    def test_count_distinct(self):
        df = pd.DataFrame([
            [1, 1000],
            [1, 1000],
            [1, 1100],
            [2, 1150],
        ], columns=[
            'group_id',
            'order_id',
        ])
        action = dict(
            action_arguments=['order_id'],
            action_options=dict(
                groupby_columns=['group_id']
            ),
            outputs=[
                dict(uuid='order_count'),
            ],
        )
        df_new = count_distinct(df, action)
        self.assertEqual(df_new.to_dict(orient='records'), [
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
        ])

    def test_count_with_time_window(self):
        df = pd.DataFrame([
            [1, 1000, '2021-10-01', '2021-09-01'],
            [1, 1050, '2021-10-01', '2021-08-01'],
            [1, 1100, '2021-10-01', '2021-01-01'],
            [2, 1150, '2021-09-01', '2021-08-01'],
        ], columns=[
            'group_id',
            'order_id',
            'group_churned_at',
            'order_created_at',
        ])
        action = dict(
            action_arguments=['order_id'],
            action_code='',
            action_options=dict(
                groupby_columns=['group_id'],
                timestamp_feature_a='group_churned_at',
                timestamp_feature_b='order_created_at',
                window=90*24*3600,
            ),
            outputs=[
                dict(uuid='order_count'),
            ],
        )
        df_new = count(df, action)
        self.assertEqual(df_new.to_dict(orient='records'), [
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
        ])

    def test_count_with_filter(self):
        df = pd.DataFrame([
            [1, 1000, '2021-10-01', '2021-09-01'],
            [1, 1050, '2021-10-01', '2021-08-01'],
            [1, 1100, '2021-10-01', '2021-01-01'],
            [2, 1150, '2021-09-01', '2021-08-01'],
            [2, 1200, '2021-09-01', '2021-08-16'],
            [2, 1250, '2021-09-01', '2021-08-14'],
        ], columns=[
            'group_id',
            'order_id',
            'group_churned_at',
            'order_created_at',
        ])
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
        df_expected = pd.DataFrame([
            [1, 1000, '2021-10-01', '2021-09-01', 2],
            [1, 1050, '2021-10-01', '2021-08-01', 2],
            [1, 1100, '2021-10-01', '2021-01-01', 2],
            [2, 1150, '2021-09-01', '2021-08-01', 2],
            [2, 1200, '2021-09-01', '2021-08-16', 2],
            [2, 1250, '2021-09-01', '2021-08-14', 2],
        ], columns=[
            'group_id',
            'order_id',
            'group_churned_at',
            'order_created_at',
            'order_count',
        ])
        assert_frame_equal(df_new, df_expected)

    def test_diff(self):
        df = pd.DataFrame([
            ['2020-01-01', 1000],
            ['2020-01-02', 1050],
            ['2020-01-03', 1200],
            ['2020-01-04', 990],
        ], columns=[
            'date',
            'sold',
        ])
        action = dict(
            action_arguments=['sold'],
            outputs=[
                dict(uuid='sold_diff'),
            ],
        )
        df_new = diff(df, action)
        self.assertEqual(df_new.to_dict(orient='records')[1:], [
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
        ])

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
        df = pd.DataFrame([
            [1, 1000],
            [2, 1050],
            [1, 1100],
            [2, 1150],
        ], columns=[
            'group_id',
            'order_id',
        ])
        action = dict(
            action_arguments=['order_id'],
            action_options=dict(
                groupby_columns=['group_id']
            ),
            outputs=[
                dict(uuid='first_order'),
            ],
        )
        df_new = first(df, action)
        self.assertEqual(df_new.to_dict(orient='records'), [
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
        ])

    def test_impute(self):
        from data_cleaner.transformer_actions.column import impute
        df = pd.DataFrame([
            ['2020-01-01', 1000, '       ', 800],
            ['2020-01-02', '', 1200, 700],
            ['2020-01-03', 1200, np.NaN, 900],
            ['2020-01-04', np.NaN, '  ', 700],
            ['2020-01-05', 1700, 1300, 800],
        ], columns=[
            'date',
            'sold',
            'curr_profit',
            'prev_sold',
        ])
        action1 = dict(
            action_arguments=['sold', 'curr_profit'],
            action_options={
                'value': '0',
            },
            action_variables={
                '0': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'sold',
                    },
                    'type': 'feature',
                },
                '1': {
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
                '0': {
                    'feature': {
                        'column_type': 'number',
                        'uuid': 'sold',
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
        )
        action4 = dict(
            action_arguments=['sold', 'curr_profit'],
            action_options={
                'strategy': 'median',
            },
        )
        action5 = dict(
            action_arguments=['sold', 'curr_profit'],
            action_options={
                'strategy': 'column',
                'value': 'prev_sold',
            },
        )
        action_invalid = dict(
            action_arguments=['sold', 'curr_profit'],
            action_options={
                'strategy': 'mode',
            },
        )
        df_new1 = impute(df.copy(), action1)
        df_new2 = impute(df.copy(), action2)
        df_new3 = impute(df.copy(), action3)
        df_new4 = impute(df.copy(), action4)
        df_new5 = impute(df.copy(), action5)

        df_expected1 = pd.DataFrame([
            ['2020-01-01', 1000, 0, 800],
            ['2020-01-02', 0, 1200, 700],
            ['2020-01-03', 1200, 0, 900],
            ['2020-01-04', 0, 0, 700],
            ['2020-01-05', 1700, 1300, 800],
        ], columns=[
            'date',
            'sold',
            'curr_profit',
            'prev_sold',
        ])
        df_expected2 = pd.DataFrame([
            ['2020-01-01', 1000, '       ', 800],
            ['2020-01-02', 0, 1200, 700],
            ['2020-01-03', 1200, np.nan, 900],
            ['2020-01-04', 0, '  ', 700],
            ['2020-01-05', 1700, 1300, 800],
        ], columns=[
            'date',
            'sold',
            'curr_profit',
            'prev_sold',
        ])
        df_expected3 = pd.DataFrame([
            ['2020-01-01', 1000, 1250, 800],
            ['2020-01-02', 1300, 1200, 700],
            ['2020-01-03', 1200, 1250, 900],
            ['2020-01-04', 1300, 1250, 700],
            ['2020-01-05', 1700, 1300, 800],
        ], columns=[
            'date',
            'sold',
            'curr_profit',
            'prev_sold',
        ])
        df_expected4 = pd.DataFrame([
            ['2020-01-01', 1000, 1250, 800],
            ['2020-01-02', 1200, 1200, 700],
            ['2020-01-03', 1200, 1250, 900],
            ['2020-01-04', 1200, 1250, 700],
            ['2020-01-05', 1700, 1300, 800],
        ], columns=[
            'date',
            'sold',
            'curr_profit',
            'prev_sold',
        ])
        df_expected5 = pd.DataFrame([
            ['2020-01-01', 1000, 800, 800],
            ['2020-01-02', 700, 1200, 700],
            ['2020-01-03', 1200, 900, 900],
            ['2020-01-04', 700, 700, 700],
            ['2020-01-05', 1700, 1300, 800],
        ], columns=[
            'date',
            'sold',
            'curr_profit',
            'prev_sold',
        ])
        
        df_new1['sold'] = df_new1['sold'].astype(int)
        df_new1['curr_profit'] = df_new1['curr_profit'].astype(int)
        df_new2['sold'] = df_new2['sold'].astype(int)
        df_new3['sold'] = df_new3['sold'].astype(int)
        df_new3['curr_profit'] = df_new3['curr_profit'].astype(int)
        df_new4['sold'] = df_new4['sold'].astype(int)
        df_new4['curr_profit'] = df_new4['curr_profit'].astype(int)
        df_new5['sold'] = df_new5['sold'].astype(int)
        df_new5['curr_profit'] = df_new5['curr_profit'].astype(int)

        assert_frame_equal(df_new1, df_expected1)
        assert_frame_equal(df_new2, df_expected2)
        assert_frame_equal(df_new3, df_expected3)
        assert_frame_equal(df_new4, df_expected4)
        assert_frame_equal(df_new5, df_expected5)
        
        with self.assertRaises(Exception):
            _ = impute(df.copy(), action_invalid)

    def test_last_column(self):
        df = pd.DataFrame([
            [1, 1000],
            [2, 1050],
            [1, 1100],
            [2, 1150],
        ], columns=[
            'group_id',
            'order_id',
        ])
        action = dict(
            action_arguments=['order_id'],
            action_options=dict(
                groupby_columns=['group_id']
            ),
            outputs=[
                dict(uuid='last_order'),
            ],
        )
        df_new = last(df, action)
        self.assertEqual(df_new.to_dict(orient='records'), [
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
        ])

    def test_max(self):
        from data_cleaner.transformer_actions.column import max
        action = self.__groupby_agg_action('max_amount')
        df_new = max(TEST_DATAFRAME.copy(), action)
        df_expected = pd.DataFrame([
            [1, 1000, 1100],
            [2, 1050, 1150],
            [1, 1100, 1100],
            [2, 1150, 1150],
        ], columns=[
            'group_id',
            'amount',
            'max_amount',
        ])
        assert_frame_equal(df_new, df_expected)

        action2 =  dict(
            action_arguments=['amount'],
            action_options=dict(),
            outputs=[
                dict(uuid='max_amount'),
            ],
        )
        df_new2 = max(TEST_DATAFRAME.copy(), action2)
        df_expected2 = pd.DataFrame([
            [1, 1000, 1150],
            [2, 1050, 1150],
            [1, 1100, 1150],
            [2, 1150, 1150],
        ], columns=[
            'group_id',
            'amount',
            'max_amount',
        ])
        assert_frame_equal(df_new2, df_expected2)

    def test_median(self):
        from data_cleaner.transformer_actions.column import median
        action = self.__groupby_agg_action('median_amount')
        df = pd.DataFrame([
            [1, 1000],
            [2, 1050],
            [1, 1100],
            [2, 1550],
            [2, 1150],
        ], columns=[
            'group_id',
            'amount',
        ])
        df_new = median(df, action)
        df_expected = pd.DataFrame([
            [1, 1000, 1050],
            [2, 1050, 1150],
            [1, 1100, 1050],
            [2, 1550, 1150],
            [2, 1150, 1150],
        ], columns=[
            'group_id',
            'amount',
            'median_amount',
        ])
        assert_frame_equal(df_new, df_expected)

    def test_min(self):
        from data_cleaner.transformer_actions.column import min
        action = self.__groupby_agg_action('min_amount')
        df_new = min(TEST_DATAFRAME.copy(), action)
        df_expected = pd.DataFrame([
            [1, 1000, 1000],
            [2, 1050, 1050],
            [1, 1100, 1000],
            [2, 1150, 1050],
        ], columns=[
            'group_id',
            'amount',
            'min_amount',
        ])
        assert_frame_equal(df_new, df_expected)

    def test_select(self):
        df = pd.DataFrame([
            [1, 1000],
            [2, 1050],
        ], columns=[
            'group_id',
            'order_id',
        ])
        action = dict(
            action_arguments=['group_id']
        )
        df_new = select(df, action)
        self.assertEqual(df_new.to_dict(orient='records'), [
            dict(
                group_id=1,
            ),
            dict(
                group_id=2,
            ),
        ])

    def test_shift_down(self):
        df = pd.DataFrame([
            ['2020-01-01', 1000],
            ['2020-01-02', 1050],
            ['2020-01-03', 1200],
            ['2020-01-04', 990],
        ], columns=[
            'date',
            'sold',
        ])
        action = dict(
            action_arguments=['sold'],
            outputs=[
                dict(uuid='prev_sold'),
            ],
        )
        df_new = shift_down(df, action)
        self.assertEqual(df_new.to_dict(orient='records')[1:], [
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
        ])

    def test_shift_down_with_groupby(self):
        df = pd.DataFrame([
            [1, '2020-01-01', 1000],
            [1, '2020-01-02', 1050],
            [2, '2020-01-03', 1200],
            [1, '2020-01-04', 990],
            [2, '2020-01-05', 980],
            [2, '2020-01-06', 970],
            [2, '2020-01-07', 960],
        ], columns=[
            'group_id',
            'date',
            'sold',
        ])
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
        df_expected = pd.DataFrame([
            [1, '2020-01-01', 1000, None],
            [1, '2020-01-02', 1050, None],
            [2, '2020-01-03', 1200, None],
            [1, '2020-01-04', 990, 1000],
            [2, '2020-01-05', 980, None],
            [2, '2020-01-06', 970, 1200],
            [2, '2020-01-07', 960, 980],
        ], columns=[
            'group_id',
            'date',
            'sold',
            'prev_sold',
        ])
        assert_frame_equal(df_new, df_expected)

    def test_shift_up(self):
        df = pd.DataFrame([
            ['2020-01-01', 1000],
            ['2020-01-02', 1050],
            ['2020-01-03', 1200],
            ['2020-01-04', 990],
        ], columns=[
            'date',
            'sold',
        ])
        action = dict(
            action_arguments=['sold'],
            outputs=[
                dict(uuid='next_sold'),
            ],
        )
        df_new = shift_up(df, action)
        self.assertEqual(df_new.to_dict(orient='records')[:-1], [
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
        ])

    def test_sum(self):
        from data_cleaner.transformer_actions.column import sum
        action = self.__groupby_agg_action('total_amount')
        df_new = sum(TEST_DATAFRAME.copy(), action)
        self.assertEqual(df_new.to_dict(orient='records'), [
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
        ])

    def __groupby_agg_action(self, output_col):
        return dict(
            action_arguments=['amount'],
            action_options=dict(
                groupby_columns=['group_id']
            ),
            outputs=[
                dict(uuid=output_col),
            ],
        )
