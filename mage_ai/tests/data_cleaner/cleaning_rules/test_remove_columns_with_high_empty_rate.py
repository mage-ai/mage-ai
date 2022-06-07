from mage_ai.data_cleaner.cleaning_rules.remove_columns_with_high_empty_rate import (
    RemoveColumnsWithHighEmptyRate,
)
from mage_ai.tests.base_test import TestCase
import numpy as np
import pandas as pd


class RemoveColumnWithHighEmptyRateTests(TestCase):
    def test_evaluate(self):
        df = pd.DataFrame(
            [
                [1, '2022-01-01'],
                [2, np.NaN],
                [3, np.NaN],
                [4, np.NaN],
                [5, np.NaN],
            ],
            columns=['id', 'deleted_at'],
        )
        column_types = {
            'id': 'number',
            'deleted_at': 'datetime',
        }
        statistics = {
            'id/null_value_rate': 0,
            'deleted_at/null_value_rate': 0.8,
        }
        result = RemoveColumnsWithHighEmptyRate(
            df,
            column_types,
            statistics,
        ).evaluate()

        self.assertEqual(
            result,
            [
                dict(
                    title='Remove columns with high empty rate',
                    message='Remove columns with many missing values may increase data quality.',
                    status='not_applied',
                    action_payload=dict(
                        action_type='remove',
                        action_arguments=['deleted_at'],
                        action_code='',
                        action_options={},
                        action_variables={},
                        axis='column',
                        outputs=[],
                    ),
                )
            ],
        )
