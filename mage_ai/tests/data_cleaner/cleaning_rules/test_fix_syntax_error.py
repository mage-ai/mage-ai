from datetime import datetime as dt
from mage_ai.data_cleaner.cleaning_rules.fix_syntax_errors import FixSyntaxErrors
from mage_ai.data_cleaner.column_types.constants import ColumnType
from mage_ai.data_cleaner.statistics.calculator import StatisticsCalculator
from mage_ai.tests.base_test import TestCase
import pandas as pd
import numpy as np


class FixSyntaxErrorsTest(TestCase):
    def test_evaluate(self):
        df = pd.DataFrame(
            [
                [
                    '-12.3%',
                    1000,
                    '11111',
                    'email@maile.com',
                    '12223334444',
                    '12/13/2014',
                    dt(2022, 6, 27),
                    'a@b.c',
                ],
                [
                    '$2.234',
                    1050,
                    '2222-2222',
                    'er34ee@int.co',
                    ' 1(000)-111-2222',
                    'not a time',
                    dt(2022, 6, 27),
                    'b@c.d',
                ],
                [
                    'eieio',
                    np.nan,
                    '09876',
                    None,
                    '12345678901234',
                    '4/27/2019 12:34:45',
                    dt(2022, 6, 27),
                    'c@d.e',
                ],
                ['-4', 1150, None, 'email@email@email.com', 'qqqqqqqqqqq', None, dt(2022, 6, 27)],
                [
                    'not a number',
                    1150,
                    '23423932423',
                    'eeeeeeeee',
                    '1234',
                    '12-24-2022',
                    dt(2022, 6, 27),
                    'd@e.f',
                ],
                [
                    None,
                    1150,
                    '234.3324',
                    'agoodemail@network.net',
                    '43213240089',
                    'is not time',
                    dt(2022, 6, 27),
                    'e@f.g',
                ],
            ],
            columns=[
                'number',
                'number_but_correct_type',
                'zipcode',
                'email',
                'phone_number',
                'date',
                'date_but_correct_type',
                'email_but_all_correct',
            ],
        )
        column_types = {
            'number': ColumnType.NUMBER,
            'number_but_correct_type': ColumnType.NUMBER,
            'zipcode': ColumnType.ZIP_CODE,
            'email': ColumnType.EMAIL,
            'phone_number': ColumnType.PHONE_NUMBER,
            'date': ColumnType.DATETIME,
            'date_but_correct_type': ColumnType.DATETIME,
            'email_but_all_correct': ColumnType.DATETIME,
        }
        statistics = {
            'number/invalid_value_rate': 3 / 7,
            'number_but_correct_type/invalid_value_rate': 0 / 7,
            'zipcode/invalid_value_rate': 3 / 7,
            'email/invalid_value_rate': 3 / 7,
            'phone_number/invalid_value_rate': 4 / 7,
            'date/invalid_value_rate': 4 / 7,
            'date_but_correct_type/invalid_value_rate': 0 / 7,
            'email_but_all_correct/invalid_value_rate': 0 / 7,
        }
        result = FixSyntaxErrors(
            df,
            column_types,
            statistics,
        ).evaluate()

        self.assertEqual(
            result,
            [
                dict(
                    title='Fix syntax errors',
                    message='Fix syntactical errors to reduce the amount of noise in the data.',
                    status='not_applied',
                    action_payload=dict(
                        action_type='fix_syntax_errors',
                        action_arguments=[
                            'number',
                            'zipcode',
                            'email',
                            'phone_number',
                            'date',
                        ],
                        action_code='',
                        action_options={},
                        action_variables=dict(
                            number=dict(
                                feature=dict(column_type='number', uuid='number'), type='feature'
                            ),
                            zipcode=dict(
                                feature=dict(column_type='zip_code', uuid='zipcode'), type='feature'
                            ),
                            email=dict(
                                feature=dict(column_type='email', uuid='email'), type='feature'
                            ),
                            phone_number=dict(
                                feature=dict(column_type='phone_number', uuid='phone_number'),
                                type='feature',
                            ),
                            date=dict(
                                feature=dict(column_type='datetime', uuid='date'), type='feature'
                            ),
                        ),
                        axis='column',
                        outputs=[],
                    ),
                )
            ],
        )
