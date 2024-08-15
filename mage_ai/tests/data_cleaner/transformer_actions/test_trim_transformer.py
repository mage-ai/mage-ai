import unittest

import pandas as pd

from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action


class TestTrimTransformer(unittest.TestCase):
    def test_basic_trimming(self):
        df = pd.DataFrame({
            'category': ['  A  ', '  B  ', '  C  ', '  D  ']
        })

        expected_output = pd.DataFrame({
            'category': ['A', 'B', 'C', 'D']
        })

        action = build_transformer_action(
            df,
            action_type=ActionType.REFORMAT,
            arguments=['category'],
            axis=Axis.COLUMN,
            options={'reformat': 'trim'}
        )

        output = BaseAction(action).execute(df)

        pd.testing.assert_frame_equal(output, expected_output)
        print("Test 1 (Basic Trimming): Passed")

    def test_no_trimming_needed(self):
        df = pd.DataFrame({
            'category': ['A', 'B', 'C', 'D']
        })

        expected_output = df.copy()

        action = build_transformer_action(
            df,
            action_type=ActionType.REFORMAT,
            arguments=['category'],
            axis=Axis.COLUMN,
            options={'reformat': 'trim'}
        )

        output = BaseAction(action).execute(df)

        pd.testing.assert_frame_equal(output, expected_output)
        print("Test 2 (No Trimming Needed): Passed")

    def test_mixed_content(self):
        df = pd.DataFrame({
            'category': ['  A  ', 'B', '  C', 'D  ']
        })

        expected_output = pd.DataFrame({
            'category': ['A', 'B', 'C', 'D']
        })

        action = build_transformer_action(
            df,
            action_type=ActionType.REFORMAT,
            arguments=['category'],
            axis=Axis.COLUMN,
            options={'reformat': 'trim'}
        )

        output = BaseAction(action).execute(df)

        pd.testing.assert_frame_equal(output, expected_output)
        print("Test 3 (Mixed Content): Passed")

    def test_multiple_columns(self):
        df = pd.DataFrame({
            'category': ['  A  ', '  B  ', '  C  ', '  D  '],
            'subcategory': ['  X  ', 'Y  ', '  Z', ' W ']
        })

        expected_output = pd.DataFrame({
            'category': ['A', 'B', 'C', 'D'],
            'subcategory': ['X', 'Y', 'Z', 'W']
        })

        action = build_transformer_action(
            df,
            action_type=ActionType.REFORMAT,
            arguments=['category', 'subcategory'],
            axis=Axis.COLUMN,
            options={'reformat': 'trim'}
        )

        output = BaseAction(action).execute(df)

        pd.testing.assert_frame_equal(output, expected_output)
        print("Test 4 (Multiple Columns): Passed")

    def test_empty_strings(self):
        df = pd.DataFrame({
            'category': ['  ', '  B  ', '  ', '  D  ']
        })

        expected_output = pd.DataFrame({
            'category': ['', 'B', '', 'D']
        })

        action = build_transformer_action(
            df,
            action_type=ActionType.REFORMAT,
            arguments=['category'],
            axis=Axis.COLUMN,
            options={'reformat': 'trim'}
        )

        output = BaseAction(action).execute(df)

        pd.testing.assert_frame_equal(output, expected_output)
        print("Test 5 (Empty Strings): Passed")

    def test_no_columns_to_trim(self):
        df = pd.DataFrame({
            'category': ['  A  ', '  B  ', '  C  ', '  D  ']
        })

        expected_output = df.copy()

        action = build_transformer_action(
            df,
            action_type=ActionType.REFORMAT,
            arguments=[],
            axis=Axis.COLUMN,
            options={'reformat': 'trim'}
        )

        output = BaseAction(action).execute(df)

        pd.testing.assert_frame_equal(output, expected_output)
        print("Test 6 (No Columns to Trim): Passed")

    def test_column_not_found(self):
        df = pd.DataFrame({
            'category': ['  A  ', '  B  ', '  C  ', '  D  ']
        })

        with self.assertRaises(KeyError):
            action = build_transformer_action(
                df,
                action_type=ActionType.REFORMAT,
                arguments=['nonexistent_column'],
                axis=Axis.COLUMN,
                options={'reformat': 'trim'}
            )

            BaseAction(action).execute(df)

        print("Test 7 (Column Not Found): Passed")


if __name__ == '__main__':
    unittest.main()
