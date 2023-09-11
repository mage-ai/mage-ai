import datetime

import faker
import numpy as np
import pandas as pd

from mage_ai.io.export_utils import infer_dtypes
from mage_ai.io.postgres import Postgres
from mage_ai.io.trino import Trino
from mage_ai.tests.base_test import TestCase


class TypeConversionTests(TestCase):
    def setUp(self):
        np.random.seed(42)
        fake = faker.Faker()
        self.data = pd.DataFrame(
            [
                [
                    fake.name(),
                    fake.date_of_birth(),
                    fake.text(max_nb_chars=100),
                    np.random.randint(4, 10) / 2,
                    np.random.randn() * 100 + 20,
                    True if np.random.uniform() > 0.3 else False,
                    np.random.choice(['Mage', 'Data Cleaning', 'Magic', 'Awesome']),
                    np.random.randint(-100, 100),
                    np.random.randint(0, 3),
                    fake.date_this_century(),
                    fake.time_object(),
                    fake.date_time_this_century(),
                    fake.time_delta(datetime.timedelta(hours=3)),
                    np.random.randint(10000000000, 1000000000000),
                ]
                for _ in range(6)
            ],
            columns=[
                'Name',
                'Date of Birth',
                'Review',
                'Stars',
                'Profit',
                'Verified Purchase',
                'Tags',
                'Percentage Used',
                'Number of Snacks',
                'Watch Date',
                'Watch Time',
                'Watch Date And Time',
                'Elapsed Time',
                'Ticket ID',
            ],
        )
        self.dtypes = infer_dtypes(self.data)
        return super().setUp()

    def test_postgres_detection(self):
        expected_dtypes = [
            'text',
            'date',
            'text',
            'double precision',
            'double precision',
            'boolean',
            'text',
            'smallint',
            'smallint',
            'date',
            'time',
            'timestamp',
            'bigint',
            'bigint',
        ]
        psql = Postgres('test', 'test', 'test', 'test', 'test', True)
        for column, expected_dtype in zip(self.data.columns, expected_dtypes):
            dtype = self.dtypes[column]
            psql_type = psql.get_type(self.data[column], dtype)
            self.assertEqual(psql_type, expected_dtype)


class TypeConversionTestTrino(TestCase):
    def setUp(self):
        np.random.seed(42)
        fake = faker.Faker()
        print(fake.date_time())
        self.data_trino = pd.DataFrame(
            [
                [
                    fake.name(),
                    np.random.randint(0, 3),
                    fake.date_time(),
                    fake.date_time(),
                    fake.date_time(),
                    fake.date_time(),
                ]
                for _ in range(6)
            ],
            columns=[
                'Name',
                'random_number',
                'random_date_1',
                'random_date_2',
                'random_date_3',
                'random_date_4',
            ],
        )
        self.dtypes_trino = infer_dtypes(self.data_trino)
        return super().setUp()

    def test_trino_detection(self):
        expected_dtypes = [
            'VARCHAR',
            'BIGINT',
            'TIMESTAMP',
            'TIMESTAMP(6)',
            'TIMESTAMP(12)'
        ]
        random_settings = [
            None,
            None,
            None,
            6,
            12,
        ]
        trino = Trino('test', 'test', 'test', 'test', 'test', 'test', True)
        for column, expected_dtype, random_setting in zip(self.data_trino.columns, expected_dtypes,
                                                          random_settings):
            dtype = self.dtypes_trino[column]
            trino_type = trino.get_type(self.data_trino[column], dtype,
                                        settings={'data_type_properties':
                                                  {'timestamp_precision': random_setting}})
            self.assertEqual(trino_type, expected_dtype, msg=column)
