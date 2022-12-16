from mage_ai.data_cleaner.cleaning_rules.remove_columns_with_high_empty_rate import (
    RemoveColumnsWithHighEmptyRate,
)
from mage_ai.tests.base_test import TestCase
import numpy as np
import pandas as pd


class RemoveColumnWithHighEmptyRateTests(TestCase):
    def test_evaluate(self):
        result = RemoveColumnsWithHighEmptyRate(
            **self.__create_test_data(),
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

    def test_evaluate_with_custom_config(self):
        test_data = self.__create_test_data()
        result = RemoveColumnsWithHighEmptyRate(
            test_data['df'],
            test_data['column_types'],
            test_data['statistics'],
            custom_config=dict(missing_rate_threshold=0.6),
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
                        action_arguments=['country', 'deleted_at'],
                        action_code='',
                        action_options={},
                        action_variables={},
                        axis='column',
                        outputs=[],
                    ),
                )
            ],
        )

    def __create_test_data(self):
        df = pd.DataFrame(
            [
                [1, np.NaN, '2022-01-01'],
                [2, 'US', np.NaN],
                [3, 'US', np.NaN],
                [4, np.NaN, np.NaN],
                [5, np.NaN, np.NaN],
            ],
            columns=['id', 'country', 'deleted_at'],
        )
        column_types = {
            'id': 'number',
            'country': 'category',
            'deleted_at': 'datetime',
        }
        statistics = {
            'id/null_value_rate': 0,
            'country/null_value_rate': 0.6,
            'deleted_at/null_value_rate': 0.8,
        }
        return dict(
            df=df,
            column_types=column_types,
            statistics=statistics,
        )
