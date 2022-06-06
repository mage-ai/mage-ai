from mage_ai.data_cleaner.cleaning_rules.remove_columns_with_single_value import (
    RemoveColumnsWithSingleValue,
)
from mage_ai.tests.base_test import TestCase
import pandas as pd
import numpy as np


class RemoveColumnWithSingleValueTests(TestCase):
    def test_evaluate(self):
        df = pd.DataFrame(
            [
                [1, '2022-01-01', True],
                [2, '2022-01-02', True],
                [3, np.NaN, True],
                [4, np.NaN, True],
                [5, np.NaN, True],
            ],
            columns=['id', 'deleted_at', 'is_active'],
        )
        column_types = {
            'id': 'number',
            'deleted_at': 'datetime',
            'is_active': 'true_or_false',
        }
        statistics = {
            'id/count_distinct': 5,
            'deleted_at/count_distinct': 2,
            'is_active/count_distinct': 1,
        }
        result = RemoveColumnsWithSingleValue(df, column_types, statistics).evaluate()

        self.assertEqual(
            result,
            [
                dict(
                    title='Remove columns with single value',
                    message='Remove columns with a single unique value to reduce the amount of '
                    'redundant data.',
                    status='not_applied',
                    action_payload=dict(
                        action_type='remove',
                        action_arguments=['is_active'],
                        action_code='',
                        action_options={},
                        action_variables={},
                        axis='column',
                        outputs=[],
                    ),
                )
            ],
        )
