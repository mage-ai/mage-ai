import faker
import numpy as np
import pandas as pd

from mage_ai.io.export_utils import infer_dtypes
from mage_ai.io.trino import Trino
from mage_ai.tests.base_test import TestCase


class UtilsTests(TestCase):
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

    def test_convert_python_type_to_trino_type(self):
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
