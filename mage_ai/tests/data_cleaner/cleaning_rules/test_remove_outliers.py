from mage_ai.data_cleaner.cleaning_rules.remove_outliers import RemoveOutliers
from mage_ai.tests.base_test import TestCase
import pandas as pd


class RemoveOutliersTests(TestCase):
    def test_evaluate(self):
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
        column_types = {
            'number1': 'number',
            'number2': 'number',
            'number3': 'number',
        }
        statistics = {
            'number1/average': 1,
            'number1/outlier_count': 0,
            'number1/std': 0,
            'number2/average': 6.5,
            'number2/outlier_count': 0,
            'number2/std': 3.6,
            'number3/average': 915.25,
            'number3/outlier_count': 1,
            'number3/std': 287.92,
        }
        result = RemoveOutliers(df, column_types, statistics).evaluate()

        self.assertEqual(
            result,
            [
                dict(
                    title='Remove outliers',
                    message='Remove 1 outlier(s) to reduce the amount of noise in the data.',
                    status='not_applied',
                    action_payload=dict(
                        action_type='filter',
                        action_arguments=['number3'],
                        action_code='number3 <= 1779.01 and number3 >= 51.49000000000001',
                        action_options={},
                        action_variables={},
                        axis='row',
                        outputs=[],
                    ),
                )
            ],
        )

    def test_evaluate_wrapped_column_name(self):
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
            columns=['number1.', 'num,ber2', 'number ([3])'],
        )
        column_types = {
            'number1.': 'number',
            'num,ber2': 'number',
            'number ([3])': 'number',
        }
        statistics = {
            'number1./average': 1,
            'number1./outlier_count': 0,
            'number1./std': 0,
            'num,ber2/average': 6.5,
            'num,ber2/outlier_count': 0,
            'num,ber2/std': 3.6,
            'number ([3])/average': 915.25,
            'number ([3])/outlier_count': 1,
            'number ([3])/std': 287.92,
        }
        result = RemoveOutliers(df, column_types, statistics).evaluate()

        self.assertEqual(
            result,
            [
                dict(
                    title='Remove outliers',
                    message='Remove 1 outlier(s) to reduce the amount of noise in the data.',
                    status='not_applied',
                    action_payload=dict(
                        action_type='filter',
                        action_arguments=['number ([3])'],
                        action_code='"number ([3])" <= 1779.01 and "number ([3])" >= 51.49000000000001',
                        action_options={},
                        action_variables={},
                        axis='row',
                        outputs=[],
                    ),
                )
            ],
        )
