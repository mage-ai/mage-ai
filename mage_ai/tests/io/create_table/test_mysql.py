import pandas as pd

from mage_ai.io.export_utils import PandasTypes, infer_dtypes
from mage_ai.io.mysql import MySQL
from mage_ai.tests.base_test import DBTestCase


class RecordingCursor:
    def __init__(self):
        self.sql = None
        self.values = None

    def executemany(self, sql, values):
        self.sql = sql
        self.values = values


class TestTableMySQL(DBTestCase):
    def test_table_MySQL(self):
        mysql = MySQL('test', 'test', 'test', 'test', '123')
        df = pd.DataFrame({'varchar_time': '2002-01-01 00:00:00',
                           'datetime_time': '2002-01-02 00:00:00'}, index=[0])
        dtypes = infer_dtypes(df)
        db_dtypes = {col: mysql.get_type(df[col], dtypes[col]) for col in dtypes}
        unique_constraints = None
        overwrite_types = {'datetime_time': "TIMESTAMP"}
        schema_name = 'Test'
        table_name = 'Test'

        query = mysql.build_create_table_command(
            db_dtypes,
            schema_name,
            table_name,
            unique_constraints=unique_constraints,
            overwrite_types=overwrite_types,
        )
        self.assertEqual('CREATE TABLE Test (`varchar_time` TEXT NULL,`datetime_time` TIMESTAMP NULL);', # noqa
                         query)

    def test_get_type_uses_text_for_object_and_empty_columns(self):
        mysql = MySQL('test', 'test', 'test', 'test', '123')

        self.assertEqual(
            'TEXT',
            mysql.get_type(pd.Series([{'payload': '原因分析' * 100}]), PandasTypes.OBJECT),
        )
        self.assertEqual(
            'TEXT',
            mysql.get_type(pd.Series([None]), PandasTypes.EMPTY),
        )

    def test_upload_dataframe_uses_parameter_binding_for_long_utf8_text(self):
        mysql = MySQL('test', 'test', 'test', 'test', '123')
        cursor = RecordingCursor()
        value = '原因分析 こんにちは مرحبا café ' * 40

        mysql.upload_dataframe(
            cursor,
            pd.DataFrame({'payload': [value]}),
            {},
            {},
            'test_table',
        )

        self.assertIn('VALUES (%s)', cursor.sql)
        self.assertNotIn('CAST(', cursor.sql)
        self.assertNotIn('CHAR(255)', cursor.sql)
        self.assertEqual([(value,)], cursor.values)
