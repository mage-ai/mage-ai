
import logging
from typing import Dict, List, Union
from typing import IO, List, Mapping, Union

import duckdb
import simplejson
from pandas import DataFrame, Series
import pandas as pd
from mage_ai.io.base import QUERY_ROW_LIMIT, BaseIO, BaseSQLDatabase, ExportWritePolicy
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import BadConversionError, PandasTypes
import numpy as np
from mage_ai.io.export_utils import infer_dtypes
from mage_ai.io.sql import BaseSQL
from mage_ai.shared.utils import (
    convert_pandas_dtype_to_python_type,
    convert_python_type_to_clickhouse_type,
)
from mage_ai.shared.utils import clean_name
from mage_ai.shared.parsers import encode_complex

logger = logging.getLogger(__name__)


class DuckDB(BaseSQL):
    def __init__(
            self,
            database: str,
            verbose: bool = True,
            **kwargs,) -> None:
        """
        Initializes settings to connect to duck.
        """
        super().__init__(
            database=database,
            verbose=verbose,
            **kwargs
        )
        with self.printer.print_msg('Opening connection to DuckDB'):
            self._ctx = duckdb.connect(
                database=self.settings['database'],
                read_only=False
            )

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'DuckDB':
        return cls(
            database=config[ConfigKey.DUCKDB_DATABASE],
        )

    def close(self) -> None:
        """
        Close the underlying connection to the SQL data source if open. Else will do nothing.
        """
        print("Testing close DuckDB")
        self._ctx.close()

    def open(self) -> None:
        # logger.info('Testing open DuckDB')
        # logger.info('Testing open DuckDB')
        with self.printer.print_msg('Opening connection to DuckDB'):
            self._ctx = duckdb.connect(
                database=self.settings['database'],
                read_only=False
            )

    def table_exists(self, schema_name: str, table_name: str) -> bool:
        if schema_name is None or len(schema_name) == 0:
            schema_name = 'main'
        with self.conn.cursor() as cur:
            cur.execute('\n'.join([
                'SELECT * FROM information_schema.tables',
                f'WHERE table_schema = \'{schema_name}\' AND table_name = \'{table_name}\'',
            ]))
            print(f"Testing schema: {schema_name} table: {table_name}")
            result = cur.fetchall()
            print(f"Testing result: {result}")
            return len(result) >= 1

    def upload_dataframe(
        self,
        cursor,
        df: DataFrame,
        db_dtypes: List[str],
        dtypes: List[str],
        full_table_name: str,
        buffer: Union[IO, None] = None,
        **kwargs,
    ) -> None:
        # def serialize_obj(val):
        #     if type(val) is dict:
        #         return simplejson.dumps(
        #             val,
        #             default=encode_complex,
        #             ignore_nan=True,
        #         )
        #     elif type(val) is list and len(val) >= 1 and type(val[0]) is dict:
        #         return simplejson.dumps(
        #             val,
        #             default=encode_complex,
        #             ignore_nan=True,
        #         )
        #     return val

        # values_placeholder = ', '.join(["?" for i in range(len(df.columns))])
        # values = []
        # df_ = df.copy()
        # columns = df_.columns
        # for col in columns:
        #     dtype = df_[col].dtype
        #     if dtype == PandasTypes.OBJECT:
        #         df_[col] = df_[col].apply(lambda x: serialize_obj(x))
        #     elif dtype in (
        #         PandasTypes.MIXED,
        #         PandasTypes.UNKNOWN_ARRAY,
        #         PandasTypes.COMPLEX,
        #     ):
        #         df_[col] = df_[col].astype('string')

        #     # Remove extraneous surrounding double quotes
        #     # that get added while performing conversion to string.
        #     df_[col] = df_[col].apply(lambda x: x.strip('"') if x and isinstance(x, str) else x)
        # df_.replace({np.NaN: None}, inplace=True)
        # for _, row in df_.iterrows():
        #     values.append(list(row))

        # sql = f'INSERT INTO {full_table_name} VALUES ({values_placeholder})'
        # print(f'VALUES: {values}')
        sql = f'INSERT INTO {full_table_name} SELECT * FROM df'
        # print(f'VALUES: {values}')
        print(f'Testing SQL Query: {sql}')
        # cursor.executemany(sql, values)
        cursor.execute(sql)

        # values_placeholder = ', '.join(["?" for i in range(len(df.columns))])
        # values = []
        # for _, row in df.iterrows():
        #     # values.append(tuple([str(val) if type(val) is pd.Timestamp else val for val in row]))
        #     row_value = ','.join(str(val) for val in row)
        #     formated_row_value = f'({row_value})'
        #     values.append(formated_row_value)

        # sql = f'INSERT INTO {full_table_name} VALUES {",".join(values)}'
        # print(f"Testing upload dataframe: {sql}")
        # cursor.sql(sql)

    def get_type(self, column: Series, dtype: str) -> str:
        print(f"Type: {dtype}")
        if dtype in (
            PandasTypes.MIXED,
            PandasTypes.UNKNOWN_ARRAY,
            PandasTypes.COMPLEX,
        ):
            raise BadConversionError(
                f'Cannot convert column \'{column.name}\' with data type \'{dtype}\' to '
                'a DuckDB datatype.'
            )
        elif dtype in (PandasTypes.DATETIME, PandasTypes.DATETIME64):
            try:
                if column.dt.tz:
                    return 'TIMESTAMP'
            except AttributeError:
                pass
            return 'TIMESTAMP'
        elif dtype == PandasTypes.TIME:
            try:
                if column.dt.tz:
                    return 'TIME'
            except AttributeError:
                pass
            return 'TIME'
        elif dtype == PandasTypes.DATE:
            return 'DATE'
        elif dtype == PandasTypes.STRING:
            return 'TEXT'
        elif dtype == PandasTypes.CATEGORICAL:
            return 'TEXT'
        elif dtype == PandasTypes.BYTES:
            return 'VARBINARY(255)'
        elif dtype in (PandasTypes.FLOATING, PandasTypes.DECIMAL, PandasTypes.MIXED_INTEGER_FLOAT):
            return 'DECIMAL'
        elif dtype == PandasTypes.INTEGER:
            max_int, min_int = column.max(), column.min()
            if np.int16(max_int) == max_int and np.int16(min_int) == min_int:
                return 'BIGINT'
            elif np.int32(max_int) == max_int and np.int32(min_int) == min_int:
                return 'BIGINT'
            else:
                return 'BIGINT'
        elif dtype == PandasTypes.BOOLEAN:
            return 'CHAR(52)'
        elif dtype in (PandasTypes.TIMEDELTA, PandasTypes.TIMEDELTA64, PandasTypes.PERIOD):
            return 'BIGINT'
        elif dtype == PandasTypes.EMPTY:
            return 'CHAR(255)'
        else:
            print(f'Invalid datatype provided: {dtype}')

        return 'CHAR(255)'
