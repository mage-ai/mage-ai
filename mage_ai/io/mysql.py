from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import BadConversionError, PandasTypes
from mage_ai.io.sql import BaseSQL
from mage_ai.shared.utils import clean_name
from mysql.connector import connect
from mysql.connector.cursor import MySQLCursor
from pandas import DataFrame, Series
import numpy as np
from typing import IO, Mapping, Union


class MySQL(BaseSQL):
    def __init__(
        self,
        database: str,
        host: str,
        password: str,
        user: str,
        port: int = 3306,
        verbose: bool = True,
        **kwargs,
    ) -> None:
        super().__init__(
            database=database,
            host=host,
            password=password,
            port=port or 3306,
            user=user,
            verbose=verbose,
            **kwargs,
        )

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'MySQL':
        return cls(
            database=config[ConfigKey.MYSQL_DATABASE],
            host=config[ConfigKey.MYSQL_HOST],
            password=config[ConfigKey.MYSQL_PASSWORD],
            port=config[ConfigKey.MYSQL_PORT],
            user=config[ConfigKey.MYSQL_USER],
        )

    def build_create_table_command(
        self,
        dtypes: Mapping[str, str],
        schema_name: str,
        table_name: str
    ) -> str:
        query = []
        for cname in dtypes:
            query.append(f'`{clean_name(cname)}` {dtypes[cname]}')

        return f'CREATE TABLE {table_name} (' + ','.join(query) + ');'

    def open(self) -> None:
        with self.printer.print_msg('Opening connection to MySQL database'):
            self._ctx = connect(**self.settings)

    def table_exists(self, schema_name: str, table_name: str) -> bool:
        with self.conn.cursor() as cur:
            database_name = self.settings['database']
            cur.execute('\n'.join([
                'SELECT * FROM information_schema.tables ',
                f'WHERE table_schema = \'{database_name}\' AND table_name = \'{table_name}\'',
                'LIMIT 1',
            ]))
            return len(cur.fetchall()) >= 1

    def upload_dataframe(
        self,
        cursor: MySQLCursor,
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
                'a MySQL datatype.'
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
            return 'CHAR(255)'
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
