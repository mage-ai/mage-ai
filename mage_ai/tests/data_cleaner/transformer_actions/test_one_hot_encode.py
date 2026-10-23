import unittest

import numpy as np
import pandas as pd
from pandas.testing import assert_frame_equal

from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.column import one_hot_encode
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.templates.template import fetch_template_source


class OneHotEncodeTests(unittest.TestCase):
    def test_selected_column_preserves_values_index_and_input(self):
        df = pd.DataFrame(
            {'color': ['red', 'blue', 'red'], 'quantity': [2, 5, 1]},
            index=pd.Index([9, 3, 9], name='row'),
        )
        original = df.copy(deep=True)
        expected = pd.DataFrame(
            {'quantity': [2, 5, 1], 'color_blue': [0, 1, 0], 'color_red': [1, 0, 1]},
            index=df.index,
        ).astype({'color_blue': 'uint8', 'color_red': 'uint8'})
        action = build_transformer_action(
            df, action_type=ActionType.ONE_HOT_ENCODE, arguments=['color'], axis=Axis.COLUMN,
        )

        assert_frame_equal(BaseAction(action).execute(df), expected)
        assert_frame_equal(df, original)

    def test_multiple_columns_follow_selection_order(self):
        df = pd.DataFrame({
            'color': ['red', 'blue'],
            'quantity': [2, 5],
            'size': ['small', 'large'],
        })
        expected = pd.DataFrame({
            'quantity': [2, 5],
            'size_large': [0, 1],
            'size_small': [1, 0],
            'color_blue': [0, 1],
            'color_red': [1, 0],
        })
        expected[expected.columns[1:]] = expected[expected.columns[1:]].astype('uint8')
        assert_frame_equal(
            one_hot_encode(df, {'action_arguments': ['size', 'color']}), expected,
        )

    def test_null_values_have_zero_indicators(self):
        df = pd.DataFrame({'color': ['red', None, np.nan, 'blue']})
        expected = pd.DataFrame(
            {'color_blue': [0, 0, 0, 1], 'color_red': [1, 0, 0, 0]}, dtype='uint8',
        )
        assert_frame_equal(one_hot_encode(df, {'action_arguments': ['color']}), expected)

    def test_all_null_column_has_no_indicators(self):
        df = pd.DataFrame({'color': [None, None], 'quantity': [2, 5]})
        assert_frame_equal(
            one_hot_encode(df, {'action_arguments': ['color']}), df[['quantity']],
        )

    def test_declared_categories_preserve_unused_categories_and_order(self):
        df = pd.DataFrame({
            'color': pd.Categorical(['red', None], categories=['red', 'blue'], ordered=True),
        })
        expected = pd.DataFrame({'color_red': [1, 0], 'color_blue': [0, 0]}, dtype='uint8')
        assert_frame_equal(one_hot_encode(df, {'action_arguments': ['color']}), expected)

    def test_selected_numeric_categories_are_encoded(self):
        df = pd.DataFrame({'code': [2, 1, 2]})
        expected = pd.DataFrame({'code_1': [0, 1, 0], 'code_2': [1, 0, 1]}, dtype='uint8')
        assert_frame_equal(one_hot_encode(df, {'action_arguments': ['code']}), expected)

    def test_empty_dataframe_is_unchanged(self):
        df = pd.DataFrame({
            'color': pd.Series(dtype='object'), 'quantity': pd.Series(dtype='int64'),
        })
        action = build_transformer_action(
            df, action_type=ActionType.ONE_HOT_ENCODE, arguments=['color'], axis=Axis.COLUMN,
        )
        assert_frame_equal(one_hot_encode(df, action), df)
        assert_frame_equal(BaseAction(action).execute(df), df)

    def test_missing_or_invalid_selection_has_useful_error(self):
        df = pd.DataFrame({'color': ['red']})
        for action in [{}, {'action_arguments': []}, {'action_arguments': None},
                       {'action_arguments': 'color'}]:
            with self.subTest(action=action):
                with self.assertRaisesRegex(ValueError, 'at least one column in arguments'):
                    one_hot_encode(df, action)

    def test_unknown_column_has_useful_error(self):
        with self.assertRaisesRegex(ValueError, 'selected columns not found.*missing'):
            one_hot_encode(pd.DataFrame({'color': ['red']}), {'action_arguments': ['missing']})

    def test_duplicate_selections_or_source_names_are_rejected(self):
        for df, columns in [
            (pd.DataFrame({'color': ['red']}), ['color', 'color']),
            (pd.DataFrame([['red', 'blue']], columns=['color', 'color']), ['color']),
        ]:
            with self.subTest(columns=columns, source_columns=list(df.columns)):
                with self.assertRaisesRegex(ValueError, 'unique column names and selections'):
                    one_hot_encode(df, {'action_arguments': columns})

    def test_output_name_collisions_are_rejected(self):
        for df, columns in [
            (pd.DataFrame({'color': ['red'], 'color_red': [10]}), ['color']),
            (pd.DataFrame({'a': ['b_c'], 'a_b': ['c']}), ['a', 'a_b']),
        ]:
            with self.subTest(columns=columns):
                with self.assertRaisesRegex(ValueError, 'duplicate column names'):
                    one_hot_encode(df, {'action_arguments': columns})

    def test_generated_template_executes_after_columns_are_configured(self):
        source = fetch_template_source(
            BlockType.TRANSFORMER,
            {'action_type': ActionType.ONE_HOT_ENCODE, 'axis': Axis.COLUMN},
        )
        namespace = {'transformer': lambda fn: fn, 'test': lambda fn: fn}
        exec(compile(source, '<one_hot_encode_template>', 'exec'), namespace)
        df = pd.DataFrame({'color': ['red', 'blue']})
        with self.assertRaisesRegex(ValueError, 'at least one column in arguments'):
            namespace['execute_transformer_action'](df)

        configured = source.replace('arguments=[]', "arguments=['color']")
        exec(compile(configured, '<one_hot_encode_template>', 'exec'), namespace)
        expected = pd.DataFrame({'color_blue': [0, 1], 'color_red': [1, 0]}, dtype='uint8')
        assert_frame_equal(namespace['execute_transformer_action'](df), expected)
