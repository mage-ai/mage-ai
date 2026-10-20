import pandas as pd

from mage_ai.io.export_utils import infer_dtypes
from mage_ai.io.mssql import MSSQL
from mage_ai.tests.base_test import DBTestCase


class TestTableMsSQL(DBTestCase):
    def test_table_MsSQL(self):
        mssql = MSSQL('test', 'test', 'test', 'test', '123')
        df = pd.DataFrame({'varchar_time': '2002-01-01 00:00:00',
                           'datetime_time': '2002-01-02 00:00:00'}, index=[0])
        dtypes = infer_dtypes(df)
        db_dtypes = {col: mssql.get_type(df[col], dtypes[col]) for col in dtypes}
        unique_constraints = None
        overwrite_types = {'datetime_time': "TIMESTAMP"}
        schema_name = 'Test'
        table_name = 'Test'

        query = mssql.build_create_table_command(
            db_dtypes,
            schema_name,
            table_name,
            unique_constraints=unique_constraints,
            overwrite_types=overwrite_types,
        )
        self.assertEqual('CREATE TABLE Test.Test ("varchar_time" char(255),"datetime_time" TIMESTAMP);', query) # noqa
