
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import BadConversionError, PandasTypes
from mage_ai.io.sql import BaseSQL
from pandas import DataFrame, Series
from typing import IO, Mapping, Union
import pymssql
import numpy as np


class MSSQL(BaseSQL):
    def __init__(
        self,
        database: str,
        host: str,
        password: str,
        user: str,
        port: int = 1433,
        charset='utf8',
        tds_version='7.3',
        **kwargs,
    ):
        super().__init__(
            database=database,
            host=host,
            user=user,
            password=password,
            port=port,
            charset=charset,
            tds_version=tds_version,
            **kwargs
        )

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'MSSQL':
        return cls(
            database=config[ConfigKey.MSSQL_DATABASE],
            host=config[ConfigKey.MSSQL_HOST],
            password=config[ConfigKey.MSSQL_PASSWORD],
            port=config[ConfigKey.MSSQL_PORT],
            user=config[ConfigKey.MSSQL_USER],
        )

    def open(self) -> None:
        with self.printer.print_msg('Opening connection to MySQL database'):
            self._ctx = pymssql.connect(**self.settings)

    def table_exists(self, schema_name: str, table_name: str) -> bool:
        with self.conn.cursor() as cur:
            cur.execute('\n'.join([
                'SELECT * FROM information_schema.tables ',
                f'WHERE table_schema = \'{schema_name}\' AND table_name = \'{table_name}\'',
                'LIMIT 1',
            ]))
            return len(cur.fetchall()) >= 1
        
    def upload_dataframe(
        self,
        cursor: pymssql.Cursor,
        df: DataFrame,
        full_table_name: str,
        buffer: Union[IO, None] = None
    ) -> None:
        values_placeholder = ', '.join(["%s" for i in range(len(df.columns))])
        values = []
        for i, row in df.iterrows():
            values.append(tuple(row))

        sql = f'INSERT INTO {full_table_name} VALUES ({values_placeholder})'
        cursor.executemany(sql, values)

    def get_type(self, column: Series, dtype: str) -> str:
        if dtype in (
            PandasTypes.MIXED,
            PandasTypes.UNKNOWN_ARRAY,
            PandasTypes.COMPLEX,
        ):
            raise BadConversionError(
                f'Cannot convert column \'{column.name}\' with data type \'{dtype}\' to '
                'a MSSQL datatype.'
            )
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
