
import logging
from typing import IO, List, Union

import duckdb
import numpy as np
from pandas import DataFrame, Series

from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import PandasTypes
from mage_ai.io.sql import BaseSQL

logger = logging.getLogger(__name__)


class DuckDB(BaseSQL):
    def __init__(
            self,
            database: str,
            motherduck_token: str = None,
            schema: str = None,
            verbose: bool = True,
            **kwargs,) -> None:
        """
        Initializes settings to connect to duck.
        """
        super().__init__(
            database=database,
            motherduck_token=motherduck_token,
            schema=schema,
            verbose=verbose,
            **kwargs
        )
        self.open()

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'DuckDB':
        return cls(
            database=config[ConfigKey.DUCKDB_DATABASE],
            motherduck_token=config[ConfigKey.MOTHERDUCK_TOKEN],
            schema=config[ConfigKey.DUCKDB_SCHEMA],
        )

    def default_schema(self) -> str:
        return self.settings.get('schema') or 'main'

    def close(self) -> None:
        """
        Close the underlying connection to the SQL data source if open. Else will do nothing.
        """
        self._ctx.close()

    def open(self) -> None:
        with self.printer.print_msg('Opening connection to DuckDB'):
            conn_kwargs = dict(
                read_only=False,
            )
            database_url = self.settings['database']
            if database_url and database_url.startswith('md:'):
                config = dict(
                    autoload_known_extensions=False,
                    custom_user_agent='MAGE',
                )
                if self.settings.get('motherduck_token'):
                    config['motherduck_token'] = self.settings.get('motherduck_token')
                conn_kwargs['config'] = config
            self._ctx = duckdb.connect(
                database_url,
                **conn_kwargs,
            )

    def table_exists(self, schema_name: str, table_name: str) -> bool:
        if schema_name is None or len(schema_name) == 0:
            schema_name = 'main'
        with self.conn.cursor() as cur:
            cur.execute('\n'.join([
                'SELECT * FROM information_schema.tables',
                f'WHERE table_schema = \'{schema_name}\' AND table_name = \'{table_name}\'',
            ]))
            result = cur.fetchall()
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
        sql = f'INSERT INTO {full_table_name} SELECT * FROM df'
        cursor.execute(sql)

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
