from mage_ai.data_cleaner.statistics.calculator import StatisticsCalculator
from mage_ai.tests.base_test import TestCase
import pandas as pd
import numpy as np


class StatisticsCalculatorTest(TestCase):
    def test_calculate_statistics_overview(self):
        calculator = StatisticsCalculator(
            column_types=dict(
                age='number',
                country='category',
                date_joined='datetime',
                id='number',
                cancelled='true_or_false',
            ),
        )

        df = pd.DataFrame(
            [
                [1, 'JP', '2000-01-01', '1', False],
                [2, 'KO', '2000-12-01', '2', False],
                [1, 'US', '2000-07-01 00:00:00+00:00', '3', False],
                [' ', 'US', '2000-07-01 00:00:00+00:00', '4', False],
                [1, None, '2000-07-01 00:00:00+00:00', '5', False],
                ['', None, '899-07-01 00:00:00+00:00', '6', False],
                [3, 'US', None, '7', True],
            ],
            columns=['age', 'country', 'date_joined', 'id', 'cancelled'],
        )

        data = calculator.calculate_statistics_overview(df, is_clean=False)

        self.assertEqual(data['count'], 7)
        self.assertEqual(data['total_null_value_count'], 6)

        self.assertEqual(data['age/average'], 8 / 5)
        self.assertEqual(data['age/count'], 5)
        self.assertEqual(data['age/count_distinct'], 3)
        self.assertEqual(data['age/max'], 3)
        self.assertEqual(data['age/median'], 1)
        self.assertEqual(data['age/min'], 1)
        self.assertEqual(data['age/sum'], 8)
        self.assertEqual(data['age/null_value_rate'], 2 / 7)
        self.assertEqual(data['age/completeness'], 1 - data['age/null_value_rate'])
        self.assertEqual(data['age/quality'], 'Bad')

        self.assertEqual(data['country/count'], 5)
        self.assertEqual(data['country/count_distinct'], 3)
        self.assertEqual(data['country/mode'], 'US')
        self.assertEqual(data['country/null_value_rate'], 2 / 7)
        self.assertEqual(data['country/completeness'], 1 - data['country/null_value_rate'])
        self.assertEqual(data['country/quality'], 'Bad')

        self.assertEqual(data['date_joined/count'], 5)
        self.assertEqual(data['date_joined/count_distinct'], 3)
        self.assertEqual(data['date_joined/max'], '2000-12-01T00:00:00+00:00')
        self.assertEqual(data['date_joined/median'], '2000-07-01T00:00:00+00:00')
        self.assertEqual(data['date_joined/min'], '2000-01-01T00:00:00+00:00')
        self.assertEqual(data['date_joined/mode'], '2000-07-01T00:00:00+00:00')
        self.assertEqual(data['date_joined/null_value_rate'], 2 / 7)
        self.assertEqual(data['date_joined/completeness'], 1 - data['date_joined/null_value_rate'])
        self.assertEqual(data['date_joined/quality'], 'Bad')

        self.assertEqual(data['id/count'], 7)
        self.assertEqual(data['id/count_distinct'], 7)
        self.assertEqual(data['id/null_value_rate'], 0)
        self.assertEqual(data['id/completeness'], 1)
        self.assertEqual(data['id/quality'], 'Good')

        self.assertEqual(data['cancelled/mode'], False)
        self.assertEqual(data['cancelled/null_value_rate'], 0)
        self.assertEqual(data['cancelled/completeness'], 1)
        self.assertEqual(data['cancelled/quality'], 'Good')

    def test_calculate_statistics_overview_no_cleaning(self):
        calculator = StatisticsCalculator(
            column_types=dict(
                age='number',
                country='category',
                date_joined='datetime',
                id='number',
                cancelled='true_or_false',
            ),
        )

        df = pd.DataFrame(
            [
                [1, 'JP', '2000-01-01', 1, False],
                [2, 'KO', '2000-12-01', 2, False],
                [1, 'US', '2000-07-01 00:00:00+00:00', 3, False],
                [np.nan, 'US', '2000-07-01 00:00:00+00:00', 4, False],
                [1, None, '2000-07-01 00:00:00+00:00', 5, False],
                [np.nan, None, '899-07-01 00:00:00+00:00', 6, False],
                [3, 'US', None, 7, True],
            ],
            columns=['age', 'country', 'date_joined', 'id', 'cancelled'],
        )

        data = calculator.calculate_statistics_overview(df, is_clean=True)

        self.assertEqual(data['count'], 7)
        self.assertEqual(data['total_null_value_count'], 5)

        self.assertEqual(data['age/average'], 8 / 5)
        self.assertEqual(data['age/count'], 5)
        self.assertEqual(data['age/count_distinct'], 3)
        self.assertEqual(data['age/max'], 3)
        self.assertEqual(data['age/median'], 1)
        self.assertEqual(data['age/min'], 1)
        self.assertEqual(data['age/sum'], 8)
        self.assertEqual(data['age/null_value_rate'], 2 / 7)
        self.assertEqual(data['age/completeness'], 1 - data['age/null_value_rate'])
        self.assertEqual(data['age/quality'], 'Bad')

        self.assertEqual(data['country/count'], 5)
        self.assertEqual(data['country/count_distinct'], 3)
        self.assertEqual(data['country/mode'], 'US')
        self.assertEqual(data['country/null_value_rate'], 2 / 7)
        self.assertEqual(data['country/completeness'], 1 - data['country/null_value_rate'])
        self.assertEqual(data['country/quality'], 'Bad')

        self.assertEqual(data['date_joined/count'], 6)
        self.assertEqual(data['date_joined/count_distinct'], 4)
        self.assertEqual(data['date_joined/max'], '2000-12-01T00:00:00+00:00')
        self.assertEqual(data['date_joined/median'], '2000-07-01T00:00:00+00:00')
        self.assertEqual(data['date_joined/min'], '2000-01-01T00:00:00+00:00')
        self.assertEqual(data['date_joined/mode'], '2000-07-01T00:00:00+00:00')
        self.assertEqual(data['date_joined/null_value_rate'], 1 / 7)
        self.assertEqual(data['date_joined/completeness'], 1 - data['date_joined/null_value_rate'])
        self.assertEqual(data['date_joined/quality'], 'Good')

        self.assertEqual(data['id/count'], 7)
        self.assertEqual(data['id/count_distinct'], 7)
        self.assertEqual(data['id/null_value_rate'], 0)
        self.assertEqual(data['id/completeness'], 1)
        self.assertEqual(data['id/quality'], 'Good')

        self.assertEqual(data['cancelled/mode'], False)
        self.assertEqual(data['cancelled/null_value_rate'], 0)
        self.assertEqual(data['cancelled/completeness'], 1)
        self.assertEqual(data['cancelled/quality'], 'Good')

    def test_calculate_statistics_overview_divide_by_zero(self):
        calculator = StatisticsCalculator(
            column_types=dict(age='number', date='datetime', category='category', string='string'),
        )

        df = pd.DataFrame([], columns=['age', 'date', 'category', 'string'])
        data = calculator.calculate_statistics_overview(df, is_clean=False)

        self.assertEqual(data['age/count'], 0)
        self.assertEqual(data['age/count_distinct'], 0)
        self.assertEqual(data['age/null_value_rate'], 0)
        self.assertEqual(data['date/count'], 0)
        self.assertEqual(data['date/count_distinct'], 0)
        self.assertEqual(data['date/null_value_rate'], 0)
        self.assertEqual(data['category/count'], 0)
        self.assertEqual(data['category/count_distinct'], 0)
        self.assertEqual(data['category/null_value_rate'], 0)
        self.assertEqual(data['string/count'], 0)
        self.assertEqual(data['string/count_distinct'], 0)
        self.assertEqual(data['string/null_value_rate'], 0)
        print(data['date/value_counts'])

    def test_calculate_statistics_handle_nulls(self):
        calculator = StatisticsCalculator(
            column_types=dict(
                age='number',
                country='category',
                date_joined='datetime',
                id='number',
                cancelled='true_or_false',
            ),
        )

        df = pd.DataFrame(
            [
                [1, None, None, 1, False],
                [np.nan, None, '2000-12-01', 2, False],
                [np.nan, 'US', '2000-07-01 00:00:00+00:00', 3, False],
                [np.nan, 'US', '2000-07-01 00:00:00+00:00', 4, False],
                [1, None, None, 5, False],
                [np.nan, None, '899-07-01 00:00:00+00:00', 6, False],
                [3, 'JP', None, 7, True],
            ],
            columns=['age', 'country', 'date_joined', 'id', 'cancelled'],
        )

        data = calculator.calculate_statistics_overview(df, is_clean=True)

        self.assertEqual(data['count'], 7)
        self.assertEqual(data['total_null_value_count'], 11)

        self.assertEqual(data['age/average'], 5 / 3)
        self.assertEqual(data['age/count'], 3)
        self.assertEqual(data['age/count_distinct'], 2)
        self.assertEqual(data['age/max'], 3)
        self.assertEqual(data['age/median'], 1)
        self.assertEqual(data['age/min'], 1)
        self.assertEqual(data['age/sum'], 5)
        self.assertEqual(data['age/null_value_rate'], 4 / 7)
        self.assertEqual(data['age/completeness'], 1 - data['age/null_value_rate'])
        self.assertEqual(data['age/quality'], 'Bad')

        self.assertEqual(data['country/count'], 3)
        self.assertEqual(data['country/count_distinct'], 2)
        self.assertEqual(data['country/mode'], 'US')
        self.assertEqual(data['country/null_value_rate'], 4 / 7)
        self.assertEqual(data['country/completeness'], 1 - data['country/null_value_rate'])
        self.assertEqual(data['country/quality'], 'Bad')

        self.assertEqual(data['date_joined/count'], 4)
        self.assertEqual(data['date_joined/count_distinct'], 3)
        self.assertEqual(data['date_joined/max'], '2000-12-01T00:00:00+00:00')
        self.assertEqual(data['date_joined/median'], '2000-07-01T00:00:00+00:00')
        self.assertEqual(data['date_joined/min'], '2000-07-01T00:00:00+00:00')
        self.assertEqual(data['date_joined/mode'], '2000-07-01T00:00:00+00:00')
        self.assertEqual(data['date_joined/null_value_rate'], 3 / 7)
        self.assertEqual(data['date_joined/completeness'], 1 - data['date_joined/null_value_rate'])
        self.assertEqual(data['date_joined/quality'], 'Bad')

        self.assertEqual(data['id/count'], 7)
        self.assertEqual(data['id/count_distinct'], 7)
        self.assertEqual(data['id/null_value_rate'], 0)
        self.assertEqual(data['id/completeness'], 1)
        self.assertEqual(data['id/quality'], 'Good')

        self.assertEqual(data['cancelled/mode'], False)
        self.assertEqual(data['cancelled/null_value_rate'], 0)
        self.assertEqual(data['cancelled/completeness'], 1)
        self.assertEqual(data['cancelled/quality'], 'Good')
