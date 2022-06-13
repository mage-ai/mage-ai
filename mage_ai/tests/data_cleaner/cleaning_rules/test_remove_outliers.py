import statistics
from mage_ai.data_cleaner.cleaning_rules.remove_outliers import RemoveOutliers
from mage_ai.tests.base_test import TestCase
import pandas as pd
import numpy as np


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
                        action_type='remove',
                        action_arguments=[],
                        action_code='',
                        action_options={
                            'rows': [0],
                        },
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
                ['1', '1', 1],
                ['1', '2', 997],
                ['1', '3', 998],
                ['1', '4', 999],
                ['1', '5', 1000],
                ['1', '6', 997],
                ['1', '7', 998],
                ['1', '8', 999],
                ['1', '9', 1000],
                ['1', '10', 997],
                ['1', '11', 998],
                ['1', '12', 999],
            ],
            columns=['number1.', 'num,ber2', 'number ([3])'],
        )
        column_types = {
            'number1.': 'text',
            'num,ber2': 'category',
            'number ([3])': 'number',
        }
        statistics = {
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

    def test_no_numerical_columns(self):
        df = pd.DataFrame(
            [
                ['1', '1', '1'],
                ['1', '2', '997'],
                ['1', '3', '998'],
                ['1', '4', '999'],
                ['1', '5', '1000'],
                ['1', '6', '997'],
                ['1', '7', '998'],
                ['1', '8', '999'],
                ['1', '9', '1000'],
                ['1', '10', '997'],
                ['1', '11', '998'],
                ['1', '12', '999'],
            ],
            columns=['number1.', 'num,ber2', 'number ([3])'],
        )
        column_types = {
            'number1.': 'text',
            'num,ber2': 'category',
            'number ([3])': 'zipcode',
        }
        statistics = {}
        result = RemoveOutliers(df, column_types, statistics).evaluate()
        self.assertEqual(result, [])

    def test_remove_outliers_multidim_case(self):
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
        column_types = {
            'number1': 'number',
            'number2': 'number',
            'number3': 'number',
        }
        statistics = {
            'number1/average': df['number1'].mean(),
            'number1/outlier_count': 0,
            'number1/std': df['number1'].std(),
            'number2/average': df['number2'].mean(),
            'number2/outlier_count': 0,
            'number2/std': df['number2'].std(),
            'number3/average': df['number3'].mean(),
            'number3/outlier_count': 0,
            'number3/std': df['number3'].std(),
        }
        result = RemoveOutliers(df, column_types, statistics).evaluate()

        self.assertEqual(
            result,
            [
                dict(
                    title='Remove outliers',
                    message='Remove 2 outlier(s) to reduce the amount of noise in the data.',
                    status='not_applied',
                    action_payload=dict(
                        action_type='remove',
                        action_arguments=[],
                        action_code='',
                        action_options={
                            'rows': [20, 24],
                        },
                        action_variables={},
                        axis='row',
                        outputs=[],
                    ),
                )
            ],
        )

    def test_isolation_forest(self):
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
        column_types = {
            '1': 'number',
            '2': 'number',
            '3': 'number',
            '4': 'number',
            '5': 'number',
            '6': 'number',
            '7': 'number',
        }
        statistics = {}
        result = RemoveOutliers(df, column_types, statistics).evaluate()

        self.assertEqual(
            result,
            [
                dict(
                    title='Remove outliers',
                    message='Remove 4 outlier(s) to reduce the amount of noise in the data.',
                    status='not_applied',
                    action_payload=dict(
                        action_type='remove',
                        action_arguments=[],
                        action_code='',
                        action_options={
                            'rows': [0, 7, 18, 27],
                        },
                        action_variables={},
                        axis='row',
                        outputs=[],
                    ),
                )
            ],
        )
