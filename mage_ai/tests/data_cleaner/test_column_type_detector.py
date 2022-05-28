from faker import Faker
from mage_ai.data_cleaner.column_type_detector import (
    CATEGORY,
    CATEGORY_HIGH_CARDINALITY,
    DATETIME,
    EMAIL,
    MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES,
    NUMBER,
    NUMBER_WITH_DECIMALS,
    PHONE_NUMBER,
    TEXT,
    TRUE_OR_FALSE,
    ZIP_CODE,
    get_mismatched_row_count,
    infer_column_types,
)
from mage_ai.tests.base_test import TestCase
import pandas as pd

fake = Faker()


class ColumnTypeDetectorTests(TestCase):
    def test_get_mismatched_row_count(self):
        df = pd.DataFrame([
            [1, 'abc@xyz.com', '32132'],
            [2, 'abc2@xyz.com', '12345'],
            [3, 'test', '1234'],
            [4, 'abc@test.net', 'abcde'],
            [5, 'abc12345@', '54321'],
            [6, 'abcdef@123.com', '56789'],
        ], columns=['id', 'email', 'zip_code'])
        count1 = get_mismatched_row_count(df['id'], 'number')
        count2 = get_mismatched_row_count(df['email'], 'email')
        count3 = get_mismatched_row_count(df['zip_code'], 'zip_code')
        self.assertEqual(count1, 0)
        self.assertEqual(count2, 2)
        self.assertEqual(count3, 1)

    def test_infer_column_types(self):
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
                3,
                'male',
                '2020-1-1',
                '1.0',
                1,
                3,
                '30%',
                '10128-1213',
                123,
                123,
                'fire@mage.ai',
                '123-456-7890',
                'May 4, 2021, 6:35 PM',
                fake.name(),
            ],
            [
                '1',
                12.0,
                'female',
                '2020-07-13',
                ' '.join(['t' for i in range(MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES + 1)]),
                2,
                '$4',
                '12.32%',
                12345,
                1234,
                1234,
                'mage@fire.com',
                '(123) 456-7890',
                'Feb 17, 2021, 2:57 PM',
                fake.name(),
            ],
            [
                '1',
                0,
                'machine',
                '2020-06-25 01:02',
                ' '.join(['t' for i in range(MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES + 1)]),
                3,
                '$5,000',
                '50%',
                '12345',
                12345,
                12345,
                'fire_mage@mage.com',
                '1234567890',
                'Feb 18, 2021, 2:57 PM',
                fake.name(),
            ],
            [
                0,
                '40.7',
                'mutant',
                '2020-12-25 01:02:03',
                ' '.join(['t' for i in range(MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES + 1)]),
                4,
                '$5,000.01',
                '20%',
                '12345',
                12345,
                123456,
                'mage-fire@mage.ai',
                '1234567',
                'Feb 19, 2021, 2:57 PM',
                fake.name(),
            ],
            [
                0,
                '40.7',
                'alien',
                '2020-12-25T01:02:03.000Z',
                ' '.join(['t' for i in range(MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES + 1)]),
                4,
                '-$10128,121.3123',
                '18%',
                '01234',
                12345,
                12,
                'fire+1@mage.ai',
                '(123)456-7890',
                'Feb 20, 2021, 2:57 PM',
                fake.name(),
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
            table.append([
                0,
                '40.7',
                'mutant',
                date_format,
                fake.text(),
                4,
                '$5,000.01',
                '15.32%',
                '01234',
                12345,
                12,
                'fire+1@mage.ai',
                '(123)456-7890',
                'Feb 18, 2021, 2:57 PM',
                fake.name(),
            ])

        df = pd.DataFrame(table, columns=columns)
        column_types = infer_column_types(df)

        self.assertEqual(
            column_types,
            {
                'true_or_false': TRUE_OR_FALSE,
                'number_with_decimals': NUMBER_WITH_DECIMALS,
                'category': CATEGORY,
                'datetime': DATETIME,
                'text': TEXT,
                'number': NUMBER,
                'number_with_dollars': NUMBER_WITH_DECIMALS,
                'number_with_percentage': NUMBER_WITH_DECIMALS,
                'zip_code': ZIP_CODE,
                'zip_code_with_3_numbers': ZIP_CODE,
                'invalid_zip_code': NUMBER,
                'email': EMAIL,
                'phone_number': PHONE_NUMBER,
                'datetime_abnormal': DATETIME,
                'name': TEXT,
            },
        )
