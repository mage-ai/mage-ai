import pandas as pd

from mage_ai.shared.utils import (
    convert_pandas_dtype_to_python_type,
    convert_python_type_to_redshift_type,
)
from mage_ai.tests.base_test import DBTestCase


class TestTableRedshift(DBTestCase):
    def test_table_redshift(self):
        df = pd.DataFrame({'varchar_time': '2002-01-01 00:00:00',
                           'datetime_time': '2002-01-02 00:00:00'}, index=[0])
        columns = df.columns

        columns_with_type = [(
            col,
            convert_python_type_to_redshift_type(
                convert_pandas_dtype_to_python_type(df.dtypes[col]),
            ),
        ) for col in columns]

        overwrite_types = {'datetime_time': "TIMESTAMP"}
        full_table_name = 'test'
        if overwrite_types is not None:
            for index, col in enumerate(columns_with_type):
                if col[0] in overwrite_types.keys():
                    columns_with_type[index] = (col[0], overwrite_types[col[0]])

        col_with_types = [f'{col} {col_type}' for col, col_type in columns_with_type]

        col_with_types = ', '.join(col_with_types)
        query = f'CREATE TABLE IF NOT EXISTS {full_table_name} ({col_with_types})'
        self.assertEqual('CREATE TABLE IF NOT EXISTS test (varchar_time VARCHAR, datetime_time TIMESTAMP)', query) # noqa
