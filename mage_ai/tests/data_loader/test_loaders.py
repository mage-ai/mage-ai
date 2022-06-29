from psycopg2 import OperationalError
from mage_ai.data_loader.constants import FileFormat
from mage_ai.data_loader.postgres import Postgres
from mage_ai.data_loader.file import FileLoader
from pandas.testing import assert_frame_equal
from tests.base_test import TestCase
import datetime
import pandas as pd
import numpy as np
import os
import shutil


class DataLoaderTests(TestCase):
    def setUp(self):
        df = pd.DataFrame(
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
                [None, None, None, 2.0, 46.935979604420865, False, None],
            ],
        )
        test_dir = os.path.join(os.getcwd(), 'test')
        os.makedirs(os.path.join(os.getcwd(), 'test'))
        df.to_csv(os.path.join(test_dir, 'temp.csv'), index=False)
        df.to_csv(os.path.join(test_dir, 'temp'), index=False)
        df.to_json(os.path.join(test_dir, 'temp.json'))
        df.to_parquet(os.path.join(test_dir, 'temp.parquet'), index=False)
        df.to_hdf(os.path.join(test_dir, 'temp.hdf5'), key='temp', format='fixed')
        self.df = df
        return super().setUp()

    def tearDown(self):
        shutil.rmtree(os.path.join(os.getcwd(), 'test'))

    def test_postgres(self):
        loader = Postgres(dbname='postgres', user='test_user', password='password')
        with self.assertRaises(ConnectionError):
            print(loader.conn)
        with loader:
            print(loader.load("SELECT * from test_table;"))
            loader.query(
                'INSERT INTO test_table VALUES (\'another_human\', 10232, \'1400-11-23\', 0.0001);'
            )
            print(loader.load("SELECT * from test_table;"))
            print(loader.load("SELECT * from test_table WHERE age BETWEEN 18 AND 22392;"))
            loader.conn.commit()
            loader.query('DELETE FROM test_table WHERE name = \'another_human\'')
            loader.conn.commit()

        with self.assertRaises(OperationalError):
            with Postgres(dbname='postgre', user='test_user', password='password') as loader:
                print(loader.conn)

        with self.assertRaises(OperationalError):
            with Postgres(dbname='postgre', user='tet_usr', password='password') as loader:
                print(loader.conn)

        with self.assertRaises(TypeError):
            with Postgres(dbname='postgres', user='test_user', password='password') as loader:
                loader.load(
                    'INSERT INTO test_table VALUES (\'another_human\', 10232, \'1400-11-23\', 0.0001);'
                )

    def test_file(self):
        csv = FileLoader('test/temp.csv').load_data()
        csv2 = FileLoader('test/temp', FileFormat.CSV).load_data()
        json = FileLoader('test/temp.json').load_data()
        parquet = FileLoader('test/temp.parquet').load_data()
        hdf = FileLoader('test/temp.hdf5').load_data()
