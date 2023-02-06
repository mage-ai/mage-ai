from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.shared.hash import merge_dict
from mage_ai.tests.base_test import TestCase
from mage_ai.tests.data_cleaner.transformer_actions.shared import TEST_ACTION
import numpy as np
import pandas as pd


def build_df():
    return pd.DataFrame([
        [2, False, 5.0],
        ['$3', False, '$6.0', 1],
        ['$4,000', None, '$7,000', 200],
        ['$3', False, '$4.0', 3],
        ['$4,000', None, 3.0, 4],
        [5, True, 8000, 5],
    ], columns=['deposited', 'fund', 'amount', 'index']).set_index('index')


class BaseActionTests(TestCase):
    # def test_execute(self):
    #     df = build_df()

    #     base_action = BaseAction(merge_dict(
    #         TEST_ACTION,
    #         dict(action_code='%{1_1} >= 3 and (%{1_2} == false or %{1_2} != %{1_2}) '
    #                          'and %{1_4} >= 5.0'),
    #     ))

    #     self.assertEqual(base_action.execute(df).sort_values('deposited').to_numpy().tolist(), [
    #         ['$3', False, '$6.0'],
    #         ['$4,000', None, '$7,000'],
    #     ])

    def test_execute_axis_column(self):
        df = build_df()

        base_action = BaseAction(merge_dict(
            TEST_ACTION,
            dict(
                action_arguments=[
                    '%{1_1}',
                    # '%{3_1}',
                ],
                action_type='remove',
                axis='column',
            ),
        ))

        df_new = base_action.execute(df)
        self.assertEqual(df_new.values.tolist(), [
            [False, 5.0],
            [False, '$6.0'],
            [None, '$7,000'],
            [False, '$4.0'],
            [None, 3.0],
            [True, 8000],
        ])

    def test_execute_with_no_columns_to_transform(self):
        df = build_df()

        base_action = BaseAction(merge_dict(
            TEST_ACTION,
            dict(
                action_arguments=[
                    '%{1_1}',
                ],
                action_type='remove',
                axis='column',
            ),
        ))

        raised = False
        try:
            base_action.execute(df.drop(columns=['deposited']))
        except Exception:
            raised = True

        self.assertFalse(raised)

    def test_groupby(self):
        df = pd.DataFrame([
            ['a', '2020-01-03', 1050],
            ['a', '2020-01-01', 1000],
            ['b', '2020-01-04', 990],
            ['a', '2020-01-02', 1100],
            ['b', '2020-01-03', 1200],
        ], columns=[
            'store',
            'date',
            'sold',
        ])
        base_action = BaseAction(dict(
            action_type='group',
            action_arguments=['store'],
            action_code='',
            action_variables=dict(),
            child_actions=[
                dict(
                    action_type='sort',
                    axis='row',
                    action_arguments=['date'],
                    action_code='',
                    action_variables=dict(),
                ),
                dict(
                    action_type='diff',
                    action_arguments=['sold'],
                    action_code='',
                    action_variables=dict(),
                    axis='column',
                    outputs=[dict(uuid='sold_diff')]
                ),
                dict(
                    action_type='shift_down',
                    action_arguments=['sold'],
                    action_code='',
                    action_variables=dict(),
                    axis='column',
                    outputs=[dict(uuid='prev_sold')]
                ),
            ],
        ))
        df_new = base_action.execute(df)
        df_new = df_new.fillna(0)
        self.assertEqual(df_new.values.tolist(), [
            ['a', '2020-01-01', 1000, 0, 0],
            ['a', '2020-01-02', 1100, 100, 1000],
            ['a', '2020-01-03', 1050, -50, 1100],
            ['b', '2020-01-03', 1200, 0, 0],
            ['b', '2020-01-04', 990, -210, 1200],
        ])

    def test_hydrate_action(self):
        base_action = BaseAction(TEST_ACTION)
        base_action.hydrate_action()

        hydrated_action = TEST_ACTION.copy()
        hydrated_action['action_code'] = \
            'omni.deposited == True and (omni.fund == "The Quant" or omni.fund == "Yield")'
        hydrated_action['action_arguments'] = [
            'omni.deposited',
            'magic.spell',
        ]
        hydrated_action['action_options'] = dict(
            condition='omni.delivered_at >= magic.booked_at and magic.booked_at '
                      '>= omni.delivered_at - 2592000',
            default=0,
            timestamp_feature_a='omni.fund',
            timestamp_feature_b='omni.delivered_at',
            window=2592000,
        )

        self.assertEqual(base_action.action, hydrated_action)

    def test_hydrate_action_when_adding_column(self):
        base_action = BaseAction(merge_dict(TEST_ACTION, dict(
            action_type='add',
            axis='column',
        )))
        base_action.hydrate_action()

        hydrated_action = TEST_ACTION.copy()
        hydrated_action['action_code'] = \
            'omni.deposited == True and (omni.fund == "The Quant" or omni.fund == "Yield")'
        hydrated_action['action_type'] = 'add'
        hydrated_action['axis'] = 'column'
        hydrated_action['action_arguments'] = [
            'omni.deposited',
            'magic.spell',
        ]
        hydrated_action['action_options'] = dict(
            condition='omni.delivered_at >= magic.booked_at and magic.booked_at >= '
                      'omni.delivered_at - 2592000',
            default=0,
            timestamp_feature_a='omni.fund',
            timestamp_feature_b='omni.delivered_at',
            window=2592000,
        )

        self.assertEqual(base_action.action, hydrated_action)

    def test_join(self):
        df1 = pd.DataFrame([
            ['a', '2020-01-03', 1050],
            ['a', '2020-01-01', 1000],
            ['b', '2020-01-04', 990],
            ['a', '2020-01-02', 1100],
            ['b', '2020-01-03', 1200],
            ['c', '2020-01-07', 1250],
        ], columns=[
            'store',
            'date',
            'sold',
        ])
        df2 = pd.DataFrame([
            ['a', 'Store A'],
            ['b', 'Store B'],
        ], columns=[
            'store_name',
            'description',
        ])
        base_action = BaseAction(dict(
            action_type='join',
            action_arguments=[100],
            action_code='',
            action_options=dict(
                left_on=['store'],
                right_on=['store_name'],
                drop_columns=['store_name'],
                rename_columns={'description': 'store_description'}
            ),
            action_variables=dict(),
        ))
        df_new = base_action.execute(df1, df_to_join=df2)
        self.assertEqual(df_new.values.tolist(), [
            ['a', '2020-01-03', 1050, 'Store A'],
            ['a', '2020-01-01', 1000, 'Store A'],
            ['b', '2020-01-04', 990, 'Store B'],
            ['a', '2020-01-02', 1100, 'Store A'],
            ['b', '2020-01-03', 1200, 'Store B'],
            ['c', '2020-01-07', 1250, np.NaN],
        ])
        self.assertEqual(df_new.columns.to_list(), [
            'store', 'date', 'sold', 'store_description',
        ])

    def test_join_rename_column(self):
        df1 = pd.DataFrame([
            ['a', '2020-01-03', 1050],
            ['a', '2020-01-01', 1000],
            ['b', '2020-01-04', 990],
            ['a', '2020-01-02', 1100],
            ['b', '2020-01-03', 1200],
            ['c', '2020-01-07', 1250],
        ], columns=[
            'store',
            'date',
            'sold',
        ])
        df2 = pd.DataFrame([
            ['a', 'Store A', '2020-02-01'],
            ['b', 'Store B', '2020-02-02'],
        ], columns=[
            'store_name',
            'description',
            'date',
        ])
        base_action = BaseAction(dict(
            action_type='join',
            action_arguments=[100],
            action_code='',
            action_options=dict(
                left_on=['store'],
                right_on=['store_name'],
                drop_columns=['store_name'],
                rename_columns={'description': 'store_description'}
            ),
            action_variables=dict(),
            outputs=[
                {
                    'source_feature': {
                        'uuid': 'store_name',
                    },
                    'uuid': 'store_name',
                },
                {
                    'source_feature': {
                        'uuid': 'description',
                    },
                    'uuid': 'description',
                },
                {
                    'source_feature': {
                        'uuid': 'date',
                    },
                    'uuid': 'date_1',
                }
            ]
        ))
        df_new = base_action.execute(df1, df_to_join=df2)
        self.assertEqual(df_new.values.tolist(), [
            ['a', '2020-01-03', 1050, 'Store A', '2020-02-01'],
            ['a', '2020-01-01', 1000, 'Store A', '2020-02-01'],
            ['b', '2020-01-04', 990, 'Store B', '2020-02-02'],
            ['a', '2020-01-02', 1100, 'Store A', '2020-02-01'],
            ['b', '2020-01-03', 1200, 'Store B', '2020-02-02'],
            ['c', '2020-01-07', 1250, np.NaN, np.NaN],
        ])
        self.assertEqual(df_new.columns.to_list(), [
            'store', 'date', 'sold', 'store_description', 'date_1',
        ])

    def test_join_rename_join_key(self):
        df1 = pd.DataFrame([
            ['a', '2020-01-03', 1050],
            ['a', '2020-01-01', 1000],
            ['b', '2020-01-04', 990],
            ['a', '2020-01-02', 1100],
            ['b', '2020-01-03', 1200],
            ['c', '2020-01-07', 1250],
        ], columns=[
            'store',
            'date',
            'sold',
        ])
        df2 = pd.DataFrame([
            ['a', 'Store A', '2020-02-01'],
            ['b', 'Store B', '2020-02-02'],
        ], columns=[
            'store',
            'description',
            'date',
        ])
        base_action = BaseAction(dict(
            action_type='join',
            action_arguments=[100],
            action_code='',
            action_options=dict(
                left_on=['store'],
                right_on=['store'],
            ),
            action_variables=dict(),
            outputs=[
                {
                    'source_feature': {
                        'uuid': 'store',
                    },
                    'uuid': 'store_1',
                },
                {
                    'source_feature': {
                        'uuid': 'description',
                    },
                    'uuid': 'description',
                },
                {
                    'source_feature': {
                        'uuid': 'date',
                    },
                    'uuid': 'date_1',
                }
            ]
        ))
        df_new = base_action.execute(df1, df_to_join=df2)
        self.assertEqual(df_new.values.tolist(), [
            ['a', '2020-01-03', 1050, 'a', 'Store A', '2020-02-01'],
            ['a', '2020-01-01', 1000, 'a', 'Store A', '2020-02-01'],
            ['b', '2020-01-04', 990, 'b', 'Store B', '2020-02-02'],
            ['a', '2020-01-02', 1100, 'a', 'Store A', '2020-02-01'],
            ['b', '2020-01-03', 1200, 'b', 'Store B', '2020-02-02'],
            ['c', '2020-01-07', 1250, np.NaN, np.NaN, np.NaN],
        ])
        self.assertEqual(df_new.columns.to_list(), [
            'store', 'date', 'sold', 'store_1', 'description', 'date_1',
        ])

    def test_join_cast_to_str(self):
        df1 = pd.DataFrame([
            [1, '2020-01-03', 1050],
            [1, '2020-01-01', 1000],
            [2, '2020-01-04', 990],
            [1, '2020-01-02', 1100],
            [2, '2020-01-03', 1200],
            [3, '2020-01-07', 1250],
        ], columns=[
            'store',
            'date',
            'sold',
        ])
        df2 = pd.DataFrame([
            ['1', 'Store A'],
            ['2', 'Store B'],
        ], columns=[
            'store_name',
            'description',
        ])
        base_action = BaseAction(dict(
            action_type='join',
            action_arguments=[100],
            action_code='',
            action_options=dict(
                left_on=['store'],
                right_on=['store_name'],
                drop_columns=['store_name'],
                rename_columns={'description': 'store_description'}
            ),
            action_variables=dict(),
        ))
        df_new = base_action.execute(df1, df_to_join=df2)
        self.assertEqual(df_new.values.tolist(), [
            ['1', '2020-01-03', 1050, 'Store A'],
            ['1', '2020-01-01', 1000, 'Store A'],
            ['2', '2020-01-04', 990, 'Store B'],
            ['1', '2020-01-02', 1100, 'Store A'],
            ['2', '2020-01-03', 1200, 'Store B'],
            ['3', '2020-01-07', 1250, np.NaN],
        ])
        self.assertEqual(df_new.columns.to_list(), [
            'store', 'date', 'sold', 'store_description',
        ])
