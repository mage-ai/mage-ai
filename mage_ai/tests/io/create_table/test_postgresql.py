import pandas as pd
import simplejson

from mage_ai.io.export_utils import infer_dtypes
from mage_ai.io.postgres import Postgres
from mage_ai.shared.parsers import encode_complex
from mage_ai.tests.base_test import DBTestCase


class TestTablePostgres(DBTestCase):
    def test_table_postgres(self):
        psg = Postgres('test', 'test', 'test', 'test', '123')
        df = pd.DataFrame({'varchar_time': '2002-01-01 00:00:00',
                           'datetime_time': '2002-01-02 00:00:00'}, index=[0])
        dtypes = infer_dtypes(df)
        db_dtypes = {col: psg.get_type(df[col], dtypes[col]) for col in dtypes}
        unique_constraints = None
        overwrite_types = {'datetime_time': "TIMESTAMP"}
        schema_name = 'Test'
        table_name = 'Test'

        query = psg.build_create_table_command(
            db_dtypes,
            schema_name,
            table_name,
            unique_constraints=unique_constraints,
            overwrite_types=overwrite_types,
        )
        self.assertEqual('CREATE TABLE Test.Test ("varchar_time" text,"datetime_time" TIMESTAMP);',
                         query)

    def test_clean_array_value(self):
        test_cases = [
            [],
            [123],
            [['àabc', 'deèéf']],
            [['08:00', '12:00'], ['15:00', '20:00']],
            [['08:00', '12:00'], []],
        ]
        expected = [
            '{}',
            '{123}',
            '{{"àabc", "deèéf"}}',
            '{{"08:00", "12:00"}, {"15:00", "20:00"}}',
            '{{"08:00", "12:00"}, {}}',
        ]
        for val, expected_val in zip(test_cases, expected):
            cleaned_array_value = Postgres._clean_array_value(
                simplejson.dumps(
                    val,
                    default=encode_complex,
                    ensure_ascii=False,
                    ignore_nan=True,
                )
            )
            self.assertEqual(cleaned_array_value, expected_val)
