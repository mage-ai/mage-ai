from typing import IO, Any, List, Union

import numpy as np
import pyodbc
import simplejson
from pandas import DataFrame, Series
from sqlalchemy import create_engine
from sqlalchemy.engine import URL

from mage_ai.io.base import QUERY_ROW_LIMIT, ExportWritePolicy
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import PandasTypes
from mage_ai.io.sql import BaseSQL
from mage_ai.shared.parsers import encode_complex


class MSSQL(BaseSQL):
    def __init__(
        self,
        database: str,
        host: str,
        password: str,
        user: str,
        schema: str = None,
        port: int = 1433,
        verbose: bool = True,
        **kwargs,
    ) -> None:
        super().__init__(
            database=database,
            server=host,
            user=user,
            password=password,
            schema=schema,
            port=port,
            verbose=verbose,
            **kwargs
        )

    @property
    def connection_string(self):
        driver = self.settings['driver']
        server = self.settings['server']
        database = self.settings['database']
        username = self.settings['user']
        password = self.settings['password']
        return (
            f'DRIVER={{{driver}}};'
            f'SERVER={server};'
            f'DATABASE={database};'
            f'UID={username};'
            f'PWD={password};'
            'ENCRYPT=yes;'
            'TrustServerCertificate=yes;'
        )

    def default_schema(self) -> str:
        return self.settings.get('schema') or 'dbo'

    def open(self) -> None:
        with self.printer.print_msg('Opening connection to MSSQL database'):
            self._ctx = pyodbc.connect(
                self.connection_string,
            )

    def build_create_schema_command(
        self,
        schema_name: str
    ) -> str:
        return '\n'.join([
                'IF NOT EXISTS (',
                f'SELECT * FROM information_schema.schemata WHERE schema_name = \'{schema_name}\')',
                f'BEGIN EXEC(\'CREATE SCHEMA {schema_name}\') END'
            ])

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
                f'WHERE table_schema = \'{schema_name}\' AND table_name = \'{table_name}\'',
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
        def serialize_obj(val):
            if type(val) is dict or type(val) is np.ndarray:
                return simplejson.dumps(
                    val,
                    default=encode_complex,
                    ignore_nan=True,
                )
            elif type(val) is list and len(val) >= 1 and type(val[0]) is dict:
                return simplejson.dumps(
                    val,
                    default=encode_complex,
                    ignore_nan=True,
                )
            return val

        values_placeholder = ', '.join(["?" for i in range(len(df.columns))])
        values = []
        df_ = df.copy()
        columns = df_.columns
        for col in columns:
            dtype = df_[col].dtype
            if dtype == PandasTypes.OBJECT:
                df_[col] = df_[col].apply(lambda x: serialize_obj(x))
            elif dtype in (
                PandasTypes.MIXED,
                PandasTypes.UNKNOWN_ARRAY,
                PandasTypes.COMPLEX,
            ):
                df_[col] = df_[col].astype('string')

            # Remove extraneous surrounding double quotes
            # that get added while performing conversion to string.
            df_[col] = df_[col].apply(lambda x: x.strip('"') if x and isinstance(x, str) else x)
        df_.replace({np.NaN: None}, inplace=True)
        for _, row in df_.iterrows():
            values.append(tuple(row))

        sql = f'INSERT INTO {full_table_name} VALUES ({values_placeholder})'
        cursor.executemany(sql, values)

    def upload_dataframe_fast(
        self,
        df: DataFrame,
        schema_name: str,
        table_name: str,
        if_exists: ExportWritePolicy = ExportWritePolicy.REPLACE,

    ):
        connection_url = URL.create(
            'mssql+pyodbc',
            username=self.settings['user'],
            password=self.settings['password'],
            host=self.settings['server'],
            database=self.settings['database'],
            query=dict(
                driver=self.settings['driver'],
                ENCRYPT='yes',
                TrustServerCertificate='yes',
            ),
        )
        engine = create_engine(
            connection_url,
            fast_executemany=True,
        )
        df.to_sql(table_name, engine, schema=schema_name, if_exists=if_exists, index=False)

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

    def _enforce_limit(self, query: str, limit: int = QUERY_ROW_LIMIT) -> str:
        # MSSQL doesn't support WITH statements in subqueries, so if the user uses a WITH
        # statement in their query, it would break if we tried to enforce a limit.
        return query
