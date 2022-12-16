from faker import Faker
from mage_ai.data_cleaner.column_types.column_type_detector import infer_column_types
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
        self.assertEqual(data['text/word_distribution']['seat'], 4)
        self.assertEqual(data['text/word_distribution']['create'], 2)
        self.assertEqual(data['text/word_distribution']['place'], 2)
        self.assertEqual(data['text/max_word_count'], 14)
        self.assertEqual(data['text/min_word_count'], 7)

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

        self.assertEqual(expected_domain_distribution, data['emails/domain_distribution'])

    def test_calculate_statistics_list_data(self):
        lists = [
            [2, 'string', False, None],
            None,
            [np.nan, 2.0, 'string', '3'],
            ['not string?', True, True, 8, False, np.nan, None],
            "['not string?'     ,  True,True   ,8, False, np.nan, None]",
            [],
            [8, 9, 9, 8, 'pop', 'string'],
        ]
        df = pd.DataFrame({'lists': lists})
        column_types = infer_column_types(df)
        calculator = StatisticsCalculator(column_types)
        data = calculator.calculate_statistics_overview(df, is_clean=False)
        self.assertTrue(data['lists/most_frequent_element'] is np.nan)
        self.assertEqual(data['lists/least_frequent_element'], 'pop')
        self.assertEqual(data['lists/max_list_length'], 7)
        self.assertEqual(data['lists/min_list_length'], 0)
        self.assertAlmostEqual(data['lists/avg_list_length'], 4.6667, 3)

        expected_list_length_distribution = {
            4: 2,
            7: 2,
            6: 1,
            0: 1,
        }
        self.assertEqual(expected_list_length_distribution, data['lists/length_distribution'])

        expected_element_distribution = {
            'string': 3,
            8: 4,
            True: 4,
            False: 3,
            9: 2,
            np.nan: 7,
            'pop': 1,
            'not string?': 2,
            2: 2,
            '3': 1,
        }
        self.assertEqual(expected_element_distribution, data['lists/element_distribution'])

    def test_calculate_statistics_list_data_with_dictionaries(self):
        lists = [
            [{'e': 2}, 'string', False, None],
            None,
            [np.nan, 2.0, 'string', '3'],
            ['not string?', True, True, 8, False, np.nan, None, {'another_dictionary': -2342.21}],
            "['not string?'     ,  True,True   ,8, False, np.nan, None]",
            [{'dictionary': 'weird'}],
            [8, 9, 9, 8, 'pop', 'string'],
        ]
        df = pd.DataFrame({'lists': lists})
        column_types = infer_column_types(df)
        calculator = StatisticsCalculator(column_types)
        data = calculator.calculate_statistics_overview(df, is_clean=False)
        self.assertTrue(data['lists/most_frequent_element'] is np.nan)
        self.assertEqual(data['lists/least_frequent_element'], 'pop')
        self.assertEqual(data['lists/max_list_length'], 8)
        self.assertEqual(data['lists/min_list_length'], 1)
        self.assertAlmostEqual(data['lists/avg_list_length'], 5, 3)

        expected_list_length_distribution = {
            4: 2,
            7: 1,
            6: 1,
            1: 1,
            8: 1,
        }
        self.assertEqual(expected_list_length_distribution, data['lists/length_distribution'])

    def test_calculate_statistics_box_plot(self):
        df = pd.DataFrame(
            [
                [1000, 'US', 30000, 10, 'cute animal #1', 100, 30],
                [500, 'CA', 10000000, 20, 'intro to regression', 3000, 20],
                [200, '', np.nan, 50, 'daily news #1', None, 75],
                [250, 'CA', 7500, 25, 'machine learning seminar', 8000, 20],
                [1000, 'MX', 45003, 20, 'cute animal #4', 90, 40],
                [1500, 'MX', 75000, 30, '', 70, 25],
                [1500, 'US', 75000, np.nan, 'daily news #3', 70, 25],
                [None, 'US', 75000, 30, 'tutorial: how to start a startup', 70, np.nan],
                [1250, 'US', 60000, 50, 'cute animal #3', 80, 20],
                [200, 'CA', 5000, 30, '', 10000, 30],
                [800, 'US', 50, 40, 'meme compilation', 2000, 45],
                [600, 'CA', 11000, 50, 'daily news #2', 3000, 50],
                [600, 'CA', '', 50, '', 3000, None],
                [700, 'MX', 11750, 20, 'cute animal #2', 2750, 55],
                [700, '', None, 20, '', None, 55],
                [700, 'MX', 11750, '', '', 2750, 55],
                [1200, 'MX', 52000, 10, 'vc funding strats', 75, 60],
            ],
            columns=[
                'number_of_users',
                'location',
                'views',
                'number_of_creators',
                'name',
                'losses',
                'number_of_advertisers',
            ],
        )

        column_types = {
            'number_of_users': 'number',
            'location': 'category',
            'views': 'number',
            'number_of_creators': 'number',
            'name': 'text',
            'losses': 'number',
            'number_of_advertisers': 'number',
        }
        calculator = StatisticsCalculator(column_types=column_types)
        data = calculator.calculate_statistics_overview(df, is_clean=False)

        expected_box_plot_no_users = {
            'outliers': [],
            'min': 200.0,
            'first_quartile': 600.0,
            'median': 700.0,
            'third_quartile': 1000.0,
            'max': 1500.0,
        }

        expected_box_plot_views = {
            'outliers': [10000000.0],
            'min': 50.0,
            'first_quartile': 11000.0,
            'median': 37501.5,
            'third_quartile': 75000.0,
            'max': 75000.0,
        }

        self.assertEqual(expected_box_plot_no_users, data['number_of_users/box_plot_data'])
        self.assertEqual(expected_box_plot_views, data['views/box_plot_data'])
