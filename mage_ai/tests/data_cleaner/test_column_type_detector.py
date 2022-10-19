from faker import Faker
from mage_ai.data_cleaner.column_types.column_type_detector import (
    MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES,
    find_syntax_errors,
    infer_column_types,
    REGEX_NUMBER,
)
from mage_ai.data_cleaner.column_types.constants import ColumnType
from mage_ai.shared.hash import merge_dict
from mage_ai.tests.base_test import TestCase
import pandas as pd
import numpy as np


class ColumnTypeDetectorTests(TestCase):
    def setUp(self):
        Faker.seed(42)
        self.fake = Faker()
        return super().setUp()

    def test_get_syntax_errors(self):
        df = pd.DataFrame(
            [
                [1, 'abc@xyz.com', '32132'],
                [2, 'abc2@xyz.com', '12345'],
                [3, 'test', '1234'],
                [4, 'abc@test.net', 'abcde'],
                [5, 'abc12345@', '54321'],
                [6, 'abcdef@123.com', '56789'],
            ],
            columns=['id', 'email', 'zip_code'],
        )
        rows1 = df['id'][find_syntax_errors(df['id'], 'number')].tolist()
        rows2 = df['email'][find_syntax_errors(df['email'], 'email')].tolist()
        rows3 = df['zip_code'][find_syntax_errors(df['zip_code'], 'zip_code')].tolist()
        self.assertEqual(rows1, [])
        self.assertEqual(rows2, ['test', 'abc12345@'])
        self.assertEqual(rows3, ['abcde'])

    def test_get_syntax_errors_invalid_null_values(self):
        df = pd.DataFrame(
            [
                ['1', 'abc@xyz.com', 'invalid', None, '12-22-34'],
                ['2', 'missing', None, 'invalid', '4-27-19 12:45:56'],
                [np.nan, 'test', '1234', None, 'not a date'],
                [0, 'invalid', 'abcde', 'phone number', pd.NaT],
                ['4', 'abc12345@', '54321', 'missing', pd.Timestamp.min],
                ['5', None, 'missing', 'another phone', None],
            ],
            columns=['id', 'email', 'zip_code', 'phone_number', 'dates'],
        )
        rows1 = df['id'][find_syntax_errors(df['id'], 'number')].tolist()
        rows2 = df['email'][find_syntax_errors(df['email'], 'email')].tolist()
        rows3 = df['zip_code'][find_syntax_errors(df['zip_code'], 'zip_code')].tolist()
        rows4 = df['phone_number'][find_syntax_errors(df['phone_number'], 'phone_number')].tolist()
        rows5 = df['dates'][find_syntax_errors(df['dates'], 'datetime')].tolist()
        self.assertEqual(rows1, [])
        self.assertEqual(rows2, ['test', 'abc12345@'])
        self.assertEqual(rows3, ['abcde'])
        self.assertEqual(rows4, ['phone number', 'another phone'])
        self.assertEqual(rows5, ['not a date'])

    def test_number_pattern_matching(self):
        good_number_patterns = [
            '3123452',
            '23.234232',
            '-23,245,234.93',
            '.934',
            '-0.000002',
            '$ 0.043',
            '-€ 23,456,789.00092',
            '¥ 21345634',
            '- Rs   345.23423523',
            'CAD 2,345,234,345.23423',
            '234.23423423 $',
            '-8907987 CAD',
            '3239458734 元',
            '234,2342,2343.823034234%',
            '234.3433   %',
        ]
        bad_number_patterns = [
            'this is not a number',
            'NOTCURR 23423933',
            '0.000.00.000.000',
            '1-111-111-111',
            ',2343234203',
            'ksjh&A(*2jnkj&#$#$',
        ]

        for good in good_number_patterns:
            match = REGEX_NUMBER.match(good)
            self.assertIsNotNone(match)

        for bad in bad_number_patterns:
            match = REGEX_NUMBER.match(bad)
            self.assertIsNone(match)

    def test_infer_column_types(self):
        df = self.__build_test_df()
        column_types = infer_column_types(df)

        self.assertEqual(
            column_types,
            {
                'true_or_false': ColumnType.TRUE_OR_FALSE,
                'number_with_decimals': ColumnType.NUMBER_WITH_DECIMALS,
                'category': ColumnType.CATEGORY,
                'datetime': ColumnType.DATETIME,
                'text': ColumnType.TEXT,
                'number': ColumnType.NUMBER,
                'number_with_dollars': ColumnType.NUMBER_WITH_DECIMALS,
                'number_with_percentage': ColumnType.NUMBER_WITH_DECIMALS,
                'zip_code': ColumnType.ZIP_CODE,
                'zip_code_with_3_numbers': ColumnType.ZIP_CODE,
                'invalid_zip_code': ColumnType.NUMBER,
                'email': ColumnType.EMAIL,
                'phone_number': ColumnType.PHONE_NUMBER,
                'datetime_abnormal': ColumnType.DATETIME,
                'name': ColumnType.TEXT,
            },
        )

    def test_infer_column_types_with_existing_column_types(self):
        df = self.__build_test_df()
        existing_column_types = {
            'true_or_false': ColumnType.TRUE_OR_FALSE,
            'number_with_decimals': ColumnType.NUMBER,
            'category': ColumnType.CATEGORY_HIGH_CARDINALITY,
            'datetime': ColumnType.DATETIME,
            'text': ColumnType.TEXT,
            'number': ColumnType.NUMBER_WITH_DECIMALS,
            'number_with_dollars': ColumnType.NUMBER,
            'number_with_percentage': ColumnType.NUMBER,
        }
        column_types = infer_column_types(df, column_types=existing_column_types)
        self.assertEqual(
            column_types,
            merge_dict(
                existing_column_types,
                {
                    'zip_code': ColumnType.ZIP_CODE,
                    'zip_code_with_3_numbers': ColumnType.ZIP_CODE,
                    'invalid_zip_code': ColumnType.NUMBER,
                    'email': ColumnType.EMAIL,
                    'phone_number': ColumnType.PHONE_NUMBER,
                    'datetime_abnormal': ColumnType.DATETIME,
                    'name': ColumnType.TEXT,
                },
            ),
        )

    def test_integer_recognition(self):
        max_int = np.iinfo(np.int).max
        max_int_unsigned = np.iinfo(np.uint).max
        min_int = np.iinfo(np.int).min
        df = pd.DataFrame(
            dict(
                integers=[1, 2, 3, 4, 5],
                not_integers=[1.2, 3.4, 5.6, 6.8, 9.2],
                more_integers=[1.0, 2.0, 3.0, 4.0, 5.0],
                integers_with_null=[1, None, 2, 3, np.nan],
                not_integers_with_null=[1.1, np.nan, 2.0, 3.0, np.nan],
                str_integers=['1.0', None, '2.0', '3.0', None],
                str_not_integers=['1.000', None, '2.0002', '3.000', None],
                large_integers=[max_int, min_int, max_int - 1, min_int + 1, max_int],
                large_integers_unsigned=[
                    max_int,
                    max_int_unsigned,
                    max_int - 1,
                    0,
                    max_int_unsigned,
                ],
                str_large_integers=[
                    str(max_int),
                    str(min_int),
                    str(max_int - 1),
                    str(min_int + 1),
                    str(max_int),
                ],
                too_large_integers=[
                    str(max_int),
                    str(min_int),
                    str(max_int + 1),
                    str(min_int - 1),
                    str(max_int),
                ],
                too_large_integers_version_2=[
                    str(max_int),
                    str(min_int),
                    str(max_int_unsigned),
                    str(min_int - 1),
                    str(max_int),
                ],
            )
        )
        ctypes = infer_column_types(df)
        expected_ctypes = dict(
            integers='number',
            not_integers='number_with_decimals',
            more_integers='number',
            integers_with_null='number',
            not_integers_with_null='number_with_decimals',
            str_integers='number',
            str_not_integers='number_with_decimals',
            large_integers='number',
            large_integers_unsigned='number',
            str_large_integers='number',
            too_large_integers='category',
            too_large_integers_version_2='category',
        )
        self.assertEqual(ctypes, expected_ctypes)

    def test_phone_number_recognition(self):
        df = pd.DataFrame(
            dict(
                phone_num=[self.fake.phone_number() for _ in range(6)],
                str_int_phone_nums=[
                    '9999999999',
                    '12345678909',
                    '918328328322',
                    '33459830234',
                    '8234592345',
                    '23439433343',
                ],
                not_phone_nums=[
                    '99999',
                    '12349',
                    '918328328322',
                    '33430234',
                    '8234592345',
                    '23439433343',
                ],
                int_phone_nums=[
                    9999999999,
                    12345678909,
                    918328328322,
                    33459830234,
                    8234592345,
                    23439433343,
                ],
                float_phone_nums=[
                    9999999999,
                    np.nan,
                    918328328322.0,
                    33459830234,
                    8234592345,
                    np.nan,
                ],
                not_float_phone_nums=[
                    9999999999.00234233,
                    np.nan,
                    918328328322.0,
                    33459830234.234,
                    8234592345,
                    np.nan,
                ],
                bad_column_name_one=[
                    9999999999,
                    np.nan,
                    918328328322.0,
                    33459830234,
                    8234592345,
                    np.nan,
                ],
                bad_column_name_two=[self.fake.phone_number() for _ in range(6)],
            )
        )
        ctypes = infer_column_types(df)
        expected_ctypes = dict(
            phone_num='phone_number',
            str_int_phone_nums='phone_number',
            not_phone_nums='number',
            int_phone_nums='phone_number',
            float_phone_nums='phone_number',
            not_float_phone_nums='number_with_decimals',
            bad_column_name_one='number',
            bad_column_name_two='text',
        )
        self.assertEqual(ctypes, expected_ctypes)

    def test_zip_code_recognition(self):
        df = pd.DataFrame(
            dict(
                zip_code=[self.fake.postcode() for _ in range(6)],
                postal_code=[self.fake.postcode() for _ in range(6)],
                bad_column_name=[self.fake.postcode() for _ in range(6)],
                string_zips=[
                    '12345',
                    '132',
                    '234-3434',
                    '765',
                    '41324-2343',
                    '12342',
                ],
                not_string_postal_zips=[
                    '12',
                    '13234523452',
                    '23-3434',
                    '765,23453',
                    '41324-2343-23423',
                    '12342',
                ],
                int_zips=[
                    12345,
                    53123,
                    323,
                    423,
                    678,
                    67896,
                ],
                not_int_zips=[
                    12345,
                    34553123,
                    323343,
                    423,
                    67834534,
                    67896,
                ],
                bad_column_name_two=[
                    12345,
                    53123,
                    323,
                    423,
                    678,
                    67896,
                ],
            )
        )
        ctypes = infer_column_types(df)
        expected_ctypes = dict(
            zip_code=ColumnType.ZIP_CODE,
            postal_code=ColumnType.ZIP_CODE,
            bad_column_name=ColumnType.NUMBER,
            string_zips=ColumnType.ZIP_CODE,
            not_string_postal_zips=ColumnType.TEXT,
            int_zips=ColumnType.ZIP_CODE,
            not_int_zips=ColumnType.NUMBER,
            bad_column_name_two=ColumnType.NUMBER,
        )
        self.assertEqual(ctypes, expected_ctypes)

    def test_datetime_recognition(self):
        df = pd.DataFrame(
            dict(
                dates=[self.fake.date() for _ in range(6)],
                datetimes=[self.fake.date_time().strftime('%d-%m-%Y %H:%M:%S') for _ in range(6)],
                datetimes_iso=[self.fake.date_time().isoformat() for _ in range(6)],
                dates_w_slash=[self.fake.date_time().strftime('%m/%d/%Y') for _ in range(6)],
                datetimes_w_slash=[
                    self.fake.date_time().strftime('%m/%d/%Y %H:%M:%S') for _ in range(6)
                ],
            )
        )
        ctypes = infer_column_types(df)
        for col in ctypes:
            self.assertEqual(ctypes[col], ColumnType.DATETIME)

    def __build_test_df(self):
        columns = [
            'true_or_false',
            'number_with_decimals',
            'category',
            'datetime',
            'text',
            'number',
            'number_with_dollars',
            'number_with_percentage',
            'zip_code',
            'zip_code_with_3_numbers',
            'invalid_zip_code',
            'email',
            'phone_number',
            'datetime_abnormal',
            'name',
        ]
        table = [
            [
                '1',
                '3',
                'male',
                '2020-1-1',
                '1.0',
                '1',
                3,
                '30%',
                '10128-1213',
                123,
                123,
                'fire@mage.ai',
                '123-456-7890',
                'May 4, 2021, 6:35 PM',
                self.fake.name(),
            ],
            [
                '1',
                '12.0',
                'female',
                '2020-07-13',
                ' '.join(['t' for i in range(MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES + 1)]),
                '2',
                '€4',
                '12.32%',
                12345,
                1234,
                1234,
                'mage@fire.com',
                '(123) 456-7890',
                'Feb 17, 2021, 2:57 PM',
                self.fake.name(),
            ],
            [
                '1',
                '0',
                'machine',
                '2020-06-25 01:02',
                ' '.join(['t' for i in range(MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES + 1)]),
                '3',
                '¥5,000',
                '50%',
                '12345',
                12345,
                12345,
                'fire_mage@mage.com',
                '1234567890',
                'Feb 18, 2021, 2:57 PM',
                self.fake.name(),
            ],
            [
                0,
                '40.7',
                'mutant',
                '2020-12-25 01:02:03',
                ' '.join(['t' for i in range(MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES + 1)]),
                '4',
                'Rs 5,000.01',
                '20%',
                '12345',
                12345,
                123456,
                'mage-fire@mage.ai',
                '1234567',
                'Feb 19, 2021, 2:57 PM',
                self.fake.name(),
            ],
            [
                0,
                '40.7',
                'alien',
                '2020-12-25T01:02:03.000Z',
                ' '.join(['t' for i in range(MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES + 1)]),
                '4',
                '-10128,121.3123元',
                '18%',
                '01234',
                12345,
                12,
                'fire+1@mage.ai',
                '(123)456-7890',
                'Feb 20, 2021, 2:57 PM',
                self.fake.name(),
            ],
        ]
        date_formats = [
            '01/1/2019',
            '1/1/2019',
            '1/21/2019',
            '11/1/2019',
            '2020/01/1',
            '2020/1/01',
            '2020/1/1',
            'Pending',
        ]

        for date_format in date_formats:
            table.append(
                [
                    0,
                    '40.7',
                    'mutant',
                    date_format,
                    self.fake.text(),
                    4,
                    '$5,000.01',
                    '15.32%',
                    '01234',
                    12345,
                    12,
                    'fire+1@mage.ai',
                    '(123)456-7890',
                    'Feb 18, 2021, 2:57 PM',
                    self.fake.name(),
                ]
            )

        df = pd.DataFrame(table, columns=columns)
        return df

    def test_list_recognition(self):
        df = pd.DataFrame(
            {
                'lists': [
                    ['this', 'is', 'a', 'list', 'of', 'strings'],
                    ['this', 'is', 'a', 'list', 'of', 'strings'],
                    ['this', 'is', 'a', 'list', 'of', 'strings'],
                    None,
                ],
                'lists2': [
                    [2, 1, 3, 4, 2, 1, 2, 2],
                    [8, 9, 6, 4, 6, 4, 5, 4, 3, 4],
                    [],
                    [2, 3, 4, 1, 2],
                ],
                'lists3': [
                    None,
                    [True, False, True, True],
                    [False, True, False, True],
                    [True, True, True, False],
                ],
                'lists4': [
                    [2, 'string', False, None],
                    [np.nan, 2.0, 'string', '3'],
                    ['not string?', True, True, 8, False, np.nan, None],
                    [],
                ],
                'tuples': [
                    (2, 'string', False, None),
                    (np.nan, 2.0, 'string', '3'),
                    ('not string?', True, True, 8, False, np.nan, None),
                    tuple(),
                ],
                'string_lists': [
                    '[2, \'string\', False, None]',
                    '[np.nan,2.0,\'string\',\'3\']',
                    '[\'not string?\'   ,  True, True , 8   , False  , np.nan, None]',
                    '[]',
                ],
                'string_tuples': [
                    '(2, \'string\', False, None)',
                    '(np.nan, 2.0, \'string\', \'3\')',
                    '(\'not string?\', True, True, 8, False, np.nan, None)',
                    '()',
                ],
                'not_a_list': [
                    '3',
                    4,
                    'a category',
                    'a very long piece of text',
                ],
            }
        )
        ctypes = infer_column_types(df)
        expected_ctypes = dict(
            lists=ColumnType.LIST,
            lists2=ColumnType.LIST,
            lists3=ColumnType.LIST,
            lists4=ColumnType.LIST,
            tuples=ColumnType.LIST,
            string_lists=ColumnType.LIST,
            string_tuples=ColumnType.LIST,
            not_a_list=ColumnType.TEXT,
        )
        self.assertEqual(ctypes, expected_ctypes)
