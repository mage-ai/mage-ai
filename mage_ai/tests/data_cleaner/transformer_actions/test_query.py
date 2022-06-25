from mage_ai.data_cleaner.column_types.column_type_detector import infer_column_types
from mage_ai.data_cleaner.transformer_actions.query.query import QueryGenerator
from mage_ai.tests.base_test import TestCase
import datetime
import numpy as np
import pandas as pd


SHARED_DF = pd.DataFrame(
    columns=[
        'Name',
        'Date of Birth',
        'Review',
        'Stars',
        'Profit',
        'Verified Purchase',
        'Tags',
    ],
    data=[
        [
            'Stacy Shah',
            datetime.date(1962, 6, 9),
            'Day project support. Mean while best agreement not if traditional he.',
            np.nan,
            70.11836815760952,
            False,
            None,
        ],
        [
            None,
            None,
            'Reveal lose you born rate. Already ok think campaign green.',
            3.0,
            np.nan,
            False,
            'Awesome',
        ],
        [
            'Donald Patterson',
            datetime.date(1948, 4, 6),
            None,
            4.0,
            85.10719050696257,
            True,
            'Data Cleaning',
        ],
        [
            'Randy Roberts',
            datetime.date(2002, 2, 25),
            None,
            np.nan,
            -112.11837219268091,
            True,
            'Awesome',
        ],
        [
            None,
            datetime.date(1972, 3, 1),
            'Ever speak measure mission bank those. Black could page operation through factor support story.',
            np.nan,
            np.nan,
            np.nan,
            None,
        ],
        [None, datetime.date(2018, 4, 5), None, np.nan, np.nan, False, None],
        [
            None,
            datetime.date(2012, 1, 3),
            'Religious they area quality what card very. Young best your drive how.',
            np.nan,
            3.8741066663619677,
            None,
            'Data Cleaning',
        ],
        [
            'Alicia Lewis',
            None,
            'Realize fall shake issue majority. Draw middle beyond easy girl again heavy.',
            np.nan,
            198.80905079324953,
            None,
            'Data Cleaning',
        ],
        [
            'Amanda Foster',
            datetime.date(1931, 8, 6),
            None,
            np.nan,
            175.93815383542815,
            False,
            None,
        ],
        [
            None,
            datetime.date(1963, 11, 9),
            'Last quickly white for best face. Serious short situation such.',
            3.5,
            np.nan,
            None,
            None,
        ],
        [None, None, None, 2.0, 46.935979604420865, False, None],
        [
            'Mark Jackson',
            datetime.date(1957, 5, 9),
            'Back create gas concern. Language use forget mother benefit argue possible development.',
            3.5,
            -31.061594011997656,
            True,
            'Awesome',
        ],
        [
            'Morgan Berg',
            None,
            'General girl edge instead whether add.',
            np.nan,
            253.88379634679052,
            None,
            'Data Cleaning',
        ],
        [None, datetime.date(1919, 9, 20), None, np.nan, 124.07995273457986, None, 'Awesome'],
        ['Jessica Lopez', datetime.date(2013, 9, 5), None, 3.5, np.nan, True, None],
        [
            None,
            None,
            'Offer season manage organization explain social. Vote employee collection easy final piece.',
            np.nan,
            81.05523744403871,
            True,
            None,
        ],
        ['Linda Robles', None, None, np.nan, -148.77190096826368, False, None],
        [
            None,
            None,
            'Condition loss author discussion determine ever former.',
            4.0,
            11.878438778221964,
            True,
            'Awesome',
        ],
        [
            'Devin Knox',
            datetime.date(1973, 4, 3),
            'Whether describe would mission board level. Soldier bill need what drive individual.',
            4.5,
            -23.180991860035213,
            True,
            'Data Cleaning',
        ],
        [
            None,
            datetime.date(1911, 2, 12),
            'Development hand bed on local kind special bit. Right surface wait.',
            np.nan,
            174.485604140806,
            True,
            None,
        ],
    ],
)
SHARED_DF['Date of Birth'] = pd.to_datetime(SHARED_DF['Date of Birth'])


class QueryGenerationTests(TestCase):
    def setUp(self):
        ctypes = infer_column_types(SHARED_DF)
        self.query_gen = QueryGenerator(
            SHARED_DF, ctypes, 'mage_ai/data_cleaner/transformer_actions/sqlgrammar.lark'
        )
        return super().setUp()

    def test_column_selection(self):
        test_queries = [
            (
                'Select * FROM df',
                [
                    'Name',
                    'Date of Birth',
                    'Review',
                    'Stars',
                    'Profit',
                    'Verified Purchase',
                    'Tags',
                ],
            ),
            (
                'Select Name, "Date of Birth", Review FROM df',
                ['Name', 'Date of Birth', 'Review'],
            ),
            (
                'Select Profit, "Verified Purchase" FROM df',
                ['Profit', 'Verified Purchase'],
            ),
        ]
        for sql, pandas in test_queries:
            query = self.query_gen(sql)
            self.assertEqual(query.selection_columns, pandas)

    def test_null_filter_types(self):
        test_queries = [
            ('SELECT * FROM df WHERE (Profit IS NULL)', '(Profit.isna())'),
            (
                'SELECT * FROM df WHERE (Review is null)',
                '((Review.isna() or Review.str.len() == 0))',
            ),
            (
                'SELECT * FROM df WHERE "Verified Purchase" Is Null',
                '(`Verified Purchase`.isna() or `Verified Purchase` == \'\')',
            ),
            ('SELECT * FROM df WHERE (Profit Is NOT Null)', '(Profit.notna())'),
            (
                'SELECT * FROM df WHERE Review is not null',
                '(Review.notna() and Review.str.len() >= 1)',
            ),
            (
                'SELECT * FROM df WHERE ("Verified Purchase" IS NOT NULL)',
                '((`Verified Purchase`.notna() and `Verified Purchase` != \'\'))',
            ),
            ('SELECT * FROM df WHERE Profit NOT NULL', 'Profit.notna()'),
            ('SELECT * FROM df WHERE Profit NOTNULL', 'Profit.notna()'),
            ('SELECT * FROM df WHERE Profit ISNULL', 'Profit.isna()'),
        ]
        for sql, pandas in test_queries:
            query = self.query_gen(sql)
            self.assertEqual(query.condition, pandas)

    def test_switch_is_to_eq(self):
        test_queries = [
            ('SELECT * FROM df WHERE (Profit IS -31.061594)', '(Profit == -31.061594)'),
            ('SELECT * FROM df WHERE Profit IS not -31.061594', 'Profit != -31.061594'),
            ('SELECT * FROM df WHERE Tags is null', '(Tags.isna() or Tags.str.len() == 0)'),
            ('SELECT * FROM df WHERE Tags is "Awesome"', 'Tags == "Awesome"'),
            (
                'SELECT * FROM df WHERE "Verified Purchase" is True',
                '`Verified Purchase` == True',
            ),
        ]
        for sql, pandas in test_queries:
            query = self.query_gen(sql)
            self.assertEqual(query.condition, pandas)

    def test_like(self):
        test_queries = [
            ('SELECT * FROM df WHERE Name like "%s"', 'Name.str.fullmatch(".*s", na=False)'),
            ('SELECT * FROM df WHERE Tags like "Data%"', 'Tags.str.fullmatch("Data.*", na=False)'),
            (
                'SELECT Profit FROM df WHERE Review NOT LIKE "%os%"',
                '~Review.str.fullmatch(".*os.*", na=False)',
            ),
            (
                'SELECT "Date of Birth" FROM df WHERE Name NOT LIKE "M_r_%"',
                '~Name.str.fullmatch("M.r..*", na=False)',
            ),
        ]
        for sql, pandas in test_queries:
            query = self.query_gen(sql)
            self.assertEqual(query.condition, pandas)

    def test_between(self):
        test_queries = [
            (
                'SELECT * FROM df WHERE Profit between -40 And 40',
                '(Profit >= -40 and Profit <= 40)',
            ),
            (
                'SELECT * FROM df WHERE Name BETWEEN "aaaababa" AND "ggeggeg"',
                '(Name >= "aaaababa" and Name <= "ggeggeg")',
            ),
            (
                'SELECT * FROM df WHERE "Date of Birth" BETWEEN date("1980-06-09") AND date("2003-04-03")',
                '(`Date of Birth` >= datetime.fromisoformat("1980-06-09") and `Date of Birth` <= datetime.fromisoformat("2003-04-03"))',
            ),
        ]
        for sql, pandas in test_queries:
            query = self.query_gen(sql)
            self.assertEqual(query.condition, pandas)

    def test_in(self):
        test_queries = [
            (
                'SELECT * FROM df WHERE Tags in ("Awesome")',
                'Tags.isin(("Awesome",))',
            ),
            (
                'SELECT * FROM df WHERE Tags not in ("Awesome", "Data Cleaning")',
                '~Tags.isin(("Awesome","Data Cleaning"))',
            ),
        ]
        for sql, pandas in test_queries:
            query = self.query_gen(sql)
            self.assertEqual(query.condition, pandas)
            print(query.execute())

    def test_complex_expression(self):
        test_queries = [
            (
                'SELECT * FROM df WHERE (Tags in ("Awesome") AND Name like "%s")'
                ' OR (Stars between 3.5 and 5)',
                '(Tags.isin(("Awesome",)) and Name.str.fullmatch(".*s", na=False))'
                ' or ((Stars >= 3.5 and Stars <= 5))',
            ),
            (
                'SELECT * FROM df WHERE ("Date of Birth" BETWEEN date("1989-02-01")'
                ' AND date("2022-05-06") or Profit >= 15) '
                'and ((Name like "%s" and Name like "%x%" and Name like "%b%") OR NOT Profit < 0)',
                '((`Date of Birth` >= datetime.fromisoformat("1989-02-01") and `Date of Birth` <='
                ' datetime.fromisoformat("2022-05-06")) or Profit >= 15)'
                'and ((Name.str.fullmatch(".*s", na=False) and Name.str.fullmatch(".*x.*", na=False)'
                ' and Name.str.fullmatch(".*b.*", na=False)) or ~(Profit < 0))',
            ),
        ]
        for sql, pandas in test_queries:
            query = self.query_gen(sql)
            self.assertEqual(query.condition, pandas)

    def test_messy_formatting(self):
        test_queries = [
            (
                'select    *   From  df    wHeRe   (Tags  in ("Awesome",)     And Name  like "%s")'
                ' oR     (     Stars  betWeen    3.5    anD    5)',
                '(Tags.isin(("Awesome",)) and Name.str.fullmatch(".*s", na=False))'
                ' or ((Stars >= 3.5 and Stars <= 5))',
            ),
            (
                'seLeCT * from    df    WHERE ("Date of Birth"     BETWEEN    date("1989-02-01")'
                ' AnD date("2022-05-06")     Or Profit >= 15) '
                'And (     (Name like "%s" anD   Name like   "%x%"   aNd Name like "%b%")   oR    nOT Profit   <   0)',
                '((`Date of Birth` >= datetime.fromisoformat("1989-02-01") and `Date of Birth` <='
                ' datetime.fromisoformat("2022-05-06")) or Profit >= 15)'
                ' and ((Name.str.fullmatch(".*s", na=False) and Name.str.fullmatch(".*x.*", na=False)'
                ' and Name.str.fullmatch(".*b.*", na=False)) or ~(Profit < 0))',
            ),
        ]
        for sql, pandas in test_queries:
            query = self.query_gen(sql)
            self.assertEqual(query.condition, pandas)
