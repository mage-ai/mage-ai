from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.sql import BaseSQL
from mage_ai.shared.utils import (
    clean_name,
    convert_pandas_dtype_to_python_type,
    convert_python_type_to_trino_type,
)
from trino.dbapi import Connection, Cursor as CursorParent
from trino.transaction import IsolationLevel
from typing import IO, Mapping, Union
from pandas import DataFrame, Series


class Cursor(CursorParent):
    def __enter__(self):
        return self

    def __exit__(self, *args, **kwargs):
        pass


class ConnectionWrapper(Connection):
    def cursor(self, legacy_primitive_types: bool = None):
        """Return a new :py:class:`Cursor` object using the connection."""
        if self.isolation_level != IsolationLevel.AUTOCOMMIT:
            if self.transaction is None:
                self.start_transaction()
        if self.transaction is not None:
            request = self.transaction.request
        else:
            request = self._create_request()
        return Cursor(
            self,
            request,
            # if legacy_primitive_types is not explicitly set in Cursor,
            # take from Connection
            legacy_primitive_types
            if legacy_primitive_types is not None
            else self.legacy_primitive_types
        )

class Trino(BaseSQL):
    def __init__(
        self,
        catalog: str,
        host: str,
        user: str,
        password: str = None,
        port: int = 8080,
        schema: str = None,
        **kwargs,
    ):
        super().__init__(
            catalog=catalog,
            host=host,
            user=user,
            password=password,
            port=port,
            schema=schema,
            **kwargs
        )
    
    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'Trino':
        return cls(
            catalog=config[ConfigKey.TRINO_CATALOG],
            host=config[ConfigKey.TRINO_HOST],
            user=config[ConfigKey.TRINO_USER],
            password=config[ConfigKey.TRINO_PASSWORD],
            port=config[ConfigKey.TRINO_PORT],
            schema=config[ConfigKey.TRINO_SCHEMA],
        )

    def build_create_table_command(
        self,
        dtypes: Mapping[str, str],
        schema_name: str,
        table_name: str
    ):
        query = []
        for cname in dtypes:
            query.append(f'`{clean_name(cname)}` {dtypes[cname]}')

        return f'CREATE TABLE {table_name} (' + ','.join(query) + ');'

    def open(self) -> None:
        with self.printer.print_msg('Opening connection to Trino database'):
            self._ctx = ConnectionWrapper(**self.settings)

    def table_exists(self, schema_name: str, table_name: str) -> bool:
        with self.conn.cursor() as cur:
            catalog = self.settings['catalog']
            cur.execute('\n'.join([
                f'SHOW TABLES FROM {catalog}.{schema_name} LIKE \'{table_name}\''
            ]))
            return len(cur.fetchall()) >= 1

    def upload_dataframe(
        self,
        cursor: Cursor,
        df: DataFrame,
        full_table_name: str,
        buffer: Union[IO, None] = None
    ) -> None:
        values_placeholder = ', '.join(["%s" for _ in range(len(df.columns))])
        values = []
        for _, row in df.iterrows():
            values.append(tuple(row))

        sql = f'INSERT INTO {full_table_name} VALUES ({values_placeholder})'
        cursor.executemany(sql, values)

    def get_type(self, column: Series, dtype: str) -> str:
        return convert_python_type_to_trino_type(
            convert_pandas_dtype_to_python_type(dtype)
        )
