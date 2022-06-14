from faker import Faker
from mage_ai.data_cleaner.statistics.calculator import StatisticsCalculator
from mage_ai.tests.base_test import TestCase
from random import shuffle
import pandas as pd
import numpy as np


class StatisticsCalculatorTest(TestCase):
    def setUp(self):
        self.faker = Faker(locale='en_US')
        return super().setUp()

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

    def test_calculate_statistics_overview_invalid_indices(self):
        df = pd.DataFrame(
            [
                [1, 'abc@xyz.com', 32132],
                [2, None, 12345],
                [3, 'test', 1234],
                [4, 'abc@test.net', 'abcde'],
                [5, 'abc12345@', 54321],
                [6, 'abcdef@123.com', 56789],
            ],
            columns=['id', 'email', 'zip_code'],
        )
        calculator = StatisticsCalculator(
            column_types=dict(
                id='number',
                email='email',
                zip_code='zip_code',
            ),
        )
        data = calculator.calculate_statistics_overview(df, is_clean=True)

        self.assertEqual(data['email/invalid_values'], ['test', 'abc12345@'])
        self.assertTrue((data['email/invalid_indices'] == np.array([2, 4])).all())
        self.assertEqual(data['email/invalid_value_count'], 2)
        self.assertEqual(data['email/invalid_value_rate'], 2 / 6)

        self.assertEqual(data['zip_code/invalid_values'], ['abcde'])
        self.assertTrue((data['zip_code/invalid_indices'] == np.array([3])).all())
        self.assertEqual(data['zip_code/invalid_value_count'], 1)
        self.assertEqual(data['zip_code/invalid_value_rate'], 1 / 6)

        self.assertEqual(data['id/invalid_values'], [])
        self.assertTrue((data['id/invalid_indices'] == np.array([]).astype(int)).all())
        self.assertEqual(data['id/invalid_value_count'], 0)
        self.assertEqual(data['id/invalid_value_rate'], 0 / 6)

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
        self.assertEqual(data['age/unique_value_rate'], 0)
        self.assertEqual(data['age/invalid_value_rate'], 0)
        self.assertEqual(data['date/count'], 0)
        self.assertEqual(data['date/count_distinct'], 0)
        self.assertEqual(data['date/null_value_rate'], 0)
        self.assertEqual(data['date/unique_value_rate'], 0)
        self.assertEqual(data['date/invalid_value_rate'], 0)
        self.assertEqual(data['category/count'], 0)
        self.assertEqual(data['category/count_distinct'], 0)
        self.assertEqual(data['category/null_value_rate'], 0)
        self.assertEqual(data['category/unique_value_rate'], 0)
        self.assertEqual(data['category/invalid_value_rate'], 0)
        self.assertEqual(data['string/count'], 0)
        self.assertEqual(data['string/count_distinct'], 0)
        self.assertEqual(data['string/null_value_rate'], 0)
        self.assertEqual(data['string/unique_value_rate'], 0)
        self.assertEqual(data['string/invalid_value_rate'], 0)
        self.assertEqual(data['total_null_value_rate'], 0)
        self.assertEqual(data['total_invalid_value_rate'], 0)
        self.assertEqual(data['duplicate_row_rate'], 0)
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

    def test_calculate_statistics_text_data(self):
        texts = [
            'Know fine seat prevent 92383ee3. \nCreate Mr. real',
            'Avoid seat place.\nTrial exist against create.',
            'Exactly question mention floor time. Tree theory central seat important beyond hour.',
            'Physical father different ago away place. Health enough product even goal seat team.',
            None,
            None,
            'I know that bees make honey, but do they bake cake?',
            'It is not a problem with the quantum flux capacitor, but the light conduits',
            'Breaking News: scientists finally figure out if water is wet, leading to widespread controversy',
            'The Mage data cleaning tool is overpowered, try it out now!',
            None,
            None,
        ]
        shuffle(texts)
        df = pd.DataFrame({'text': texts})
        calculator = StatisticsCalculator(
            column_types=dict(
                text='text',
            ),
        )
        data = calculator.calculate_statistics_overview(df, is_clean=True)
        self.assertEquals(data['text/word_distribution']['seat'], 4)
        self.assertEquals(data['text/word_distribution']['create'], 2)
        self.assertEquals(data['text/word_distribution']['place'], 2)
        self.assertEquals(data['text/max_word_count'], 14)
        self.assertEquals(data['text/min_word_count'], 7)

    def test_calculate_statistics_email_data(self):
        # This data was generated using Faker
        emails = [
            'xclarke@yahoo.com',
            'daniel40@gmail.com',
            'not an email',
            'phammary@yahoo.com',
            'welchjeffrey@gmail.com',
            None,
            'an improperly formatted email@net.co',
            'wardcindy@gmail.com',
            'bdavis@yahoo.com',
            'qcarpenter@gmail.com',
            'email@net@net.com',
            'larsonkatherine@hotmail.com',
            None,
            'edwardswilliam@jones.org',
            'ojensen@hotmail.com',
            'karenmcbride@gmail.com',
            'danielharris@kim.com',
            'not an email',
        ]
        shuffle(emails)
        df = pd.DataFrame({'emails': emails})
        calculator = StatisticsCalculator(
            column_types=dict(
                emails='email',
            ),
        )
        data = calculator.calculate_statistics_overview(df, is_clean=True)

        expected_domain_distribution = {
            'gmail.com': 5,
            'yahoo.com': 3,
            'hotmail.com': 2,
            'jones.org': 1,
            'kim.com': 1,
        }

        self.assertEquals(expected_domain_distribution, data['emails/domain_distribution'])
