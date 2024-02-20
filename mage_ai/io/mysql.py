from typing import IO, Dict, List, Mapping, Union

import numpy as np
import pandas as pd
import simplejson
from mysql.connector import connect
from mysql.connector.cursor import MySQLCursor
from pandas import DataFrame, Series

from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import PandasTypes
from mage_ai.io.sql import BaseSQL
from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.utils import clean_name

QUERY_ROW_LIMIT = 10_000_000


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
        table_name: str,
        unique_constraints: List[str] = None,
        overwrite_types: Dict = None,
        **kwargs,
    ) -> str:
        if unique_constraints is None:
            unique_constraints = []
        query = []
        if overwrite_types is not None:
            for cname in dtypes:
                if cname in overwrite_types.keys():
                    dtypes[cname] = overwrite_types[cname]
                query.append(f'`{clean_name(cname)}` {dtypes[cname]} NULL')

        else:
            for cname in dtypes:
                query.append(f'`{clean_name(cname)}` {dtypes[cname]} NULL')

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
        values_placeholder = ', '.join(["%s" for i in range(len(df.columns))])
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
            values.append(tuple([str(val) if type(val) is pd.Timestamp else val for val in row]))

        insert_columns = ', '.join([f'`{col}`'for col in columns])

        sql = f'INSERT INTO {full_table_name} ({insert_columns}) VALUES ({values_placeholder})'
        cursor.executemany(sql, values)

    def get_type(self, column: Series, dtype: str) -> str:
        if dtype in (
            PandasTypes.MIXED,
            PandasTypes.UNKNOWN_ARRAY,
            PandasTypes.COMPLEX,
        ):
            return 'TEXT'
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

    def _enforce_limit(self, query: str, limit: int = QUERY_ROW_LIMIT) -> str:
        query = query.strip(';')

        return f"""
SELECT *
FROM (
    {query}
) a
LIMIT {limit}
"""
