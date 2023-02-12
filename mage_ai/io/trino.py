from io import StringIO
from mage_ai.io.base import ExportWritePolicy, QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import (
    clean_df_for_export,
    infer_dtypes,
)
from mage_ai.io.sql import BaseSQL
from mage_ai.shared.utils import (
    clean_name,
    convert_pandas_dtype_to_python_type,
    convert_python_type_to_trino_type,
)
from pandas import DataFrame, Series
from trino.auth import BasicAuthentication
from trino.dbapi import Connection, Cursor as CursorParent
from trino.transaction import IsolationLevel
from typing import IO, Mapping, Union
import pandas as pd


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
            legacy_primitive_types
            if legacy_primitive_types is not None
            else False
        )


class Trino(BaseSQL):
    QUERY_MAX_LENGTH = 100_000

    def __init__(
        self,
        catalog: str,
        host: str,
        user: str,
        password: str = None,
        port: int = 8080,
        schema: str = None,
        verbose: bool = True,
        **kwargs,
    ):
        super().__init__(
            verbose=verbose,
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
            query.append(f'"{clean_name(cname)}" {dtypes[cname]}')

        return f'CREATE TABLE {table_name} (' + ','.join(query) + ')'

    def open(self) -> None:
        with self.printer.print_msg('Opening connection to Trino database'):
            connect_kwargs = dict(
                catalog=self.settings['catalog'],
                host=self.settings['host'],
                port=self.settings['port'],
                schema=self.settings['schema'],
                user=self.settings['user'],
            )

            if self.settings.get('password'):
                connect_kwargs['auth'] = \
                    BasicAuthentication(
                        self.settings['user'], self.settings['password'])
                connect_kwargs['http_scheme'] = 'https'
            self._ctx = ConnectionWrapper(**connect_kwargs)

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
        values = []
        for _, row in df.iterrows():
            t = tuple(row)
            if len(t) == 1:
                values.append(f'({str(t[0])})')
            else:
                values.append(str(t))

        value_payload_size = 0
        subbatch_query = []
        for value in values:
            subbatch_query.append(value)
            value_payload_size += len(value) + 2
            if value_payload_size >= self.QUERY_MAX_LENGTH:
                values_string = ', '.join(subbatch_query)
                sql = f'INSERT INTO {full_table_name} VALUES {values_string}'
                cursor.execute(sql)
                subbatch_query = []
                value_payload_size = 0

        values_string = ', '.join(subbatch_query)
        sql = f'INSERT INTO {full_table_name} VALUES {values_string}'
        cursor.execute(sql)

    def get_type(self, column: Series, dtype: str) -> str:
        return convert_python_type_to_trino_type(
            convert_pandas_dtype_to_python_type(dtype)
        )

    def export(
        self,
        df: DataFrame,
        schema_name: str,
        table_name: str,
        if_exists: ExportWritePolicy = ExportWritePolicy.REPLACE,
        index: bool = False,
        verbose: bool = True,
        query_string: Union[str, None] = None,
        drop_table_on_replace: bool = False,
        cascade_on_drop: bool = False,
    ) -> None:
        """
        Exports dataframe to the connected database from a Pandas data frame. If table doesn't
        exist, the table is automatically created. If the schema doesn't exist, the schema is
        also created.

        Args:
            schema_name (str): Name of the schema of the table to export data to.
            table_name (str): Name of the table to insert rows from this data frame into.
            if_exists (ExportWritePolicy): Specifies export policy if table exists. Either
                - `'fail'`: throw an error.
                - `'replace'`: drops existing table and creates new table of same name.
                - `'append'`: appends data frame to existing table. In this case the schema must
                                match the original table.
            Defaults to `'replace'`.
            index (bool): If true, the data frame index is also exported alongside the table.
                            Defaults to False.
            **kwargs: Additional query parameters.
        """

        if type(df) is dict:
            df = pd.DataFrame([df])
        elif type(df) is list:
            df = pd.DataFrame(df)

        catalog = self.settings['catalog']
        schema = self.settings['schema']
        full_table_name = f'{catalog}.{schema}.{table_name}'

        if not query_string:
            if index:
                df = df.reset_index()

            dtypes = infer_dtypes(df)
            df = clean_df_for_export(df, self.clean, dtypes)

        def __process():
            buffer = StringIO()
            table_exists = self.table_exists(schema, table_name)

            with self.conn.cursor() as cur:
                if schema:
                    cur.execute(f'CREATE SCHEMA IF NOT EXISTS {catalog}.{schema}')

                should_create_table = not table_exists

                if table_exists:
                    if ExportWritePolicy.FAIL == if_exists:
                        raise ValueError(
                            f'Table \'{full_table_name}\' already exists in database.'
                        )
                    elif ExportWritePolicy.REPLACE == if_exists:
                        if drop_table_on_replace:
                            cmd = f'DROP TABLE {full_table_name}'
                            if cascade_on_drop:
                                cmd = f'{cmd} CASCADE'
                            cur.execute(cmd)
                            should_create_table = True
                        else:
                            cur.execute(f'DELETE FROM {full_table_name}')

                if query_string:
                    query = 'CREATE TABLE {} AS\n{}'.format(
                        full_table_name,
                        query_string,
                    )

                    if ExportWritePolicy.APPEND == if_exists and table_exists:
                        query = 'INSERT INTO {}\n{}'.format(
                            full_table_name,
                            query_string,
                        )
                    cur.execute(query)
                else:
                    if should_create_table:
                        db_dtypes = {
                            col: self.get_type(df[col], dtypes[col])
                            for col in dtypes
                        }
                        query = self.build_create_table_command(
                            db_dtypes,
                            schema_name,
                            table_name,
                        )
                        cur.execute(query)

                    self.upload_dataframe(cur, df, full_table_name, buffer)
            self.conn.commit()

        if verbose:
            with self.printer.print_msg(
                f'Exporting data to \'{full_table_name}\''
            ):
                __process()
        else:
            __process()

    def _enforce_limit(self, query: str, limit: int = QUERY_ROW_LIMIT) -> str:
        return f'SELECT * FROM ({query.strip(";")}) AS subquery LIMIT {limit}'
