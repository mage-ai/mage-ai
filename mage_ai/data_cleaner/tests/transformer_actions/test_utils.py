from data_cleaner.tests.base_test import TestCase
from data_cleaner.transformer_actions.constants import ActionType, Axis
from data_cleaner.transformer_actions.utils import columns_to_remove


class UtilsTests(TestCase):
    def test_columns_to_remove(self):
        transformer_actions = [
            dict(
                action_type=ActionType.FILTER,
                axis=Axis.COLUMN,
                action_arguments=['wand'],
            ),
            dict(
                action_type=ActionType.REMOVE,
                axis=Axis.ROW,
                action_arguments=['spear'],
            ),
            dict(
                action_type=ActionType.REMOVE,
                axis=Axis.COLUMN,
                action_arguments=['sword'],
            ),
        ]
        self.assertEqual(columns_to_remove(transformer_actions), ['sword'])
