from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import PandasTypes
from mage_ai.io.base import QUERY_ROW_LIMIT
from mage_ai.io.sql import BaseSQL
from pandas import DataFrame, Series
from typing import Any, IO, List, Union
import json
import numpy as np
import pyodbc


class MSSQL(BaseSQL):
    def __init__(
        self,
        database: str,
        host: str,
        password: str,
        user: str,
        schema: str = None,
        port: int = 1433,
        **kwargs,
    ):
        super().__init__(
            database=database,
            server=host,
            user=user,
            password=password,
            schema=schema,
            port=port,
            **kwargs
        )

    def _enforce_limit(self, query: str, limit: int = QUERY_ROW_LIMIT) -> str:
        # MSSQL doesn't support WITH statements in subqueries, so if the user uses a WITH
        # statement in their query, it would break if we tried to enforce a limit.
        return query

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'MSSQL':
        return cls(
            database=config[ConfigKey.MSSQL_DATABASE],
            schema=config[ConfigKey.MSSQL_SCHEMA],
            driver=config[ConfigKey.MSSQL_DRIVER],
            host=config[ConfigKey.MSSQL_HOST],
            password=config[ConfigKey.MSSQL_PASSWORD],
            port=config[ConfigKey.MSSQL_PORT],
            user=config[ConfigKey.MSSQL_USER],
        )

    def open(self) -> None:
        with self.printer.print_msg('Opening connection to MSSQL database'):
            driver = self.settings['driver']
            server = self.settings['server']
            database = self.settings['database']
            username = self.settings['user']
            password = self.settings['password']
            connection_string = (
                f'DRIVER={{{driver}}};'
                f'SERVER={server};'
                f'DATABASE={database};'
                f'UID={username};'
                f'PWD={password};'
                'ENCRYPT=yes;'
                'TrustServerCertificate=yes;'
            )
            self._ctx = pyodbc.connect(connection_string)

    def build_create_table_as_command(
        self,
        table_name: str,
        query_string: str
    ) -> str:
        return 'SELECT * INTO {}\nFROM ({}) AS prev'.format(
            table_name,
            query_string,
        )

    def table_exists(self, schema_name: str, table_name: str) -> bool:
        with self.conn.cursor() as cur:
            cur.execute('\n'.join([
                'SELECT TOP 1 * FROM information_schema.tables ',
                f'WHERE table_name = \'{table_name}\'',
            ]))
            return len(cur.fetchall()) >= 1

    def upload_dataframe(
        self,
        cursor: Any,
        df: DataFrame,
        db_dtypes: List[str],
        dtypes: List[str],
        full_table_name: str,
        buffer: Union[IO, None] = None,
        **kwargs,
    ) -> None:
        values_placeholder = ', '.join(["?" for i in range(len(df.columns))])
        values = []
        df_ = df.copy()
        columns = df_.columns
        for col in columns:
            dtype = df_[col].dtype
            if dtype == PandasTypes.OBJECT:
                df_[col] = df_[col].apply(lambda x: json.dumps(x))
            elif dtype in (
                PandasTypes.MIXED,
                PandasTypes.UNKNOWN_ARRAY,
                PandasTypes.COMPLEX,
            ):
                df_[col] = df_[col].astype('string')
        for i, row in df_.iterrows():
            values.append(tuple(row))

        sql = f'INSERT INTO {full_table_name} VALUES ({values_placeholder})'
        cursor.executemany(sql, values)

    def get_type(self, column: Series, dtype: str) -> str:
        if dtype in (
            PandasTypes.MIXED,
            PandasTypes.UNKNOWN_ARRAY,
            PandasTypes.COMPLEX,
            PandasTypes.OBJECT,
        ):
            return 'text'
        elif dtype in (PandasTypes.DATETIME, PandasTypes.DATETIME64):
            try:
                if column.dt.tz:
                    return 'datetime2'
            except AttributeError:
                pass
            return 'datetime2'
        elif dtype == PandasTypes.TIME:
            try:
                if column.dt.tz:
                    return 'time'
            except AttributeError:
                pass
            return 'time'
        elif dtype == PandasTypes.DATE:
            return 'date'
        elif dtype == PandasTypes.STRING:
            return 'char(255)'
        elif dtype == PandasTypes.CATEGORICAL:
            return 'text'
        elif dtype == PandasTypes.BYTES:
            return 'varbinary(255)'
        elif dtype in (PandasTypes.FLOATING, PandasTypes.DECIMAL, PandasTypes.MIXED_INTEGER_FLOAT):
            return 'decimal'
        elif dtype == PandasTypes.INTEGER:
            max_int, min_int = column.max(), column.min()
            if np.int16(max_int) == max_int and np.int16(min_int) == min_int:
                return 'bigint'
            elif np.int32(max_int) == max_int and np.int32(min_int) == min_int:
                return 'bigint'
            else:
                return 'bigint'
        elif dtype == PandasTypes.BOOLEAN:
            return 'char(52)'
        elif dtype in (PandasTypes.TIMEDELTA, PandasTypes.TIMEDELTA64, PandasTypes.PERIOD):
            return 'bigint'
        elif dtype == PandasTypes.EMPTY:
            return 'char(255)'
        else:
            print(f'Invalid datatype provided: {dtype}')

        return 'char(255)'
