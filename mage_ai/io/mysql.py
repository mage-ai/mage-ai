from typing import IO, Dict, List, Mapping, Union

import numpy as np
import pandas as pd
import simplejson
from mysql.connector import connect
from mysql.connector.cursor import MySQLCursor
from pandas import DataFrame, Series

from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.constants import UNIQUE_CONFLICT_METHOD_UPDATE
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
        allow_local_infile: bool = False,
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
            allow_local_infile=allow_local_infile,
            **kwargs,
        )

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'MySQL':
        conn_kwargs = dict(
            database=config[ConfigKey.MYSQL_DATABASE],
            host=config[ConfigKey.MYSQL_HOST],
            password=config[ConfigKey.MYSQL_PASSWORD],
            port=config[ConfigKey.MYSQL_PORT],
            user=config[ConfigKey.MYSQL_USER],
        )
        if config[ConfigKey.MYSQL_ALLOW_LOCAL_INFILE] is not None:
            conn_kwargs['allow_local_infile'] = config[ConfigKey.MYSQL_ALLOW_LOCAL_INFILE]
        return cls(**conn_kwargs)

    def build_create_table_command(
        self,
        dtypes: Mapping[str, str],
        schema_name: str,
        table_name: str,
        auto_clean_name: bool = True,
        case_sensitive: bool = False,
        unique_constraints: List[str] = None,
        overwrite_types: Dict = None,
        **kwargs,
    ) -> str:
        if unique_constraints is None:
            unique_constraints = []
        columns_and_types = []
        for cname in dtypes:
            if overwrite_types is not None and cname in overwrite_types.keys():
                dtypes[cname] = overwrite_types[cname]
            if auto_clean_name:
                cleaned_col_name = clean_name(cname, case_sensitive=case_sensitive)
            else:
                cleaned_col_name = cname
            columns_and_types.append(f'`{cleaned_col_name}` {dtypes[cname]} NULL')

        if unique_constraints:
            unique_constraints = [
                clean_name(col, case_sensitive=case_sensitive)
                for col in unique_constraints
            ]
            index_name = '_'.join([
                clean_name(table_name, case_sensitive=case_sensitive),
            ] + unique_constraints)
            index_name = f'unique{index_name}'[:64]
            columns_and_types.append(
                f"CONSTRAINT {index_name} Unique({', '.join(unique_constraints)})"
            )

        return f'CREATE TABLE {table_name} (' + ','.join(columns_and_types) + ');'

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
        case_sensitive: bool = False,
        unique_constraints: List[str] = None,
        unique_conflict_method: str = None,
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

        cleaned_columns = [clean_name(col, case_sensitive=case_sensitive) for col in columns]
        insert_columns = ', '.join([f'`{col}`'for col in cleaned_columns])

        query = [
            f'INSERT INTO {full_table_name} ({insert_columns})',
            f'VALUES ({values_placeholder})',
        ]

        if unique_constraints and unique_conflict_method:
            if UNIQUE_CONFLICT_METHOD_UPDATE == unique_conflict_method:
                update_command = [f'{col} = new.{col}' for col in cleaned_columns]
                query += [
                    'AS new',
                    f"ON DUPLICATE KEY UPDATE {', '.join(update_command)}",
                ]

        sql = '\n'.join(query)

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
