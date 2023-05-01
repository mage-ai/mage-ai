from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.constants import UNIQUE_CONFLICT_METHOD_UPDATE
from mage_ai.io.export_utils import BadConversionError, PandasTypes
from mage_ai.io.sql import BaseSQL
from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.utils import is_port_in_use
from pandas import DataFrame, Series
from psycopg2 import connect, _psycopg
from sshtunnel import SSHTunnelForwarder
from typing import IO, List, Union
import numpy as np
import pandas as pd
import simplejson


class Postgres(BaseSQL):
    """
    Handles data transfer between a PostgreSQL database and the Mage app.
    """
    def __init__(
        self,
        dbname: str,
        user: str,
        password: str,
        host: str,
        port: Union[str, None] = None,
        schema: str = None,
        connection_method: str = 'direct',
        ssh_host: Union[str, None] = None,
        ssh_port: Union[str, None] = None,
        ssh_username: Union[str, None] = None,
        ssh_password: Union[str, None] = None,
        ssh_pkey: Union[str, None] = None,
        verbose=True,
        connect_timeout: int = None,
        **kwargs,
    ) -> None:
        """
        Initializes the data loader.

        Args:
            dbname (str): The name of the database to connect to.
            user (str): The user with which to connect to the database with.
            password (str): The login password for the user.
            host (str): Path to host address for database.
            port (str): Port on which the database is running.
            **kwargs: Additional settings for creating SQLAlchemy engine and connection
        """
        self.ssh_tunnel = None
        super().__init__(
            verbose=verbose,
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port,
            schema=schema,
            connection_method=connection_method,
            ssh_host=ssh_host,
            ssh_port=ssh_port,
            ssh_username=ssh_username,
            ssh_password=ssh_password,
            ssh_pkey=ssh_pkey,
            connect_timeout=connect_timeout,
            **kwargs,
        )

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'Postgres':
        return cls(
            dbname=config[ConfigKey.POSTGRES_DBNAME],
            user=config[ConfigKey.POSTGRES_USER],
            password=config[ConfigKey.POSTGRES_PASSWORD],
            host=config[ConfigKey.POSTGRES_HOST],
            port=config[ConfigKey.POSTGRES_PORT],
            schema=config[ConfigKey.POSTGRES_SCHEMA],
            connection_method=config[ConfigKey.POSTGRES_CONNECTION_METHOD],
            ssh_host=config[ConfigKey.POSTGRES_SSH_HOST],
            ssh_port=config[ConfigKey.POSTGRES_SSH_PORT],
            ssh_username=config[ConfigKey.POSTGRES_SSH_USERNAME],
            ssh_password=config[ConfigKey.POSTGRES_SSH_PASSWORD],
            ssh_pkey=config[ConfigKey.POSTGRES_SSH_PKEY],
            connect_timeout=config[ConfigKey.POSTGRES_CONNECT_TIMEOUT],
        )

    def default_database(self) -> str:
        return self.settings['dbname']

    def default_schema(self) -> str:
        return self.settings.get('schema')

    def open(self) -> None:
        with self.printer.print_msg('Opening connection to PostgreSQL database'):
            database = self.settings['dbname']
            host = self.settings['host']
            password = self.settings['password']
            port = self.settings['port']
            user = self.settings['user']
            if self.settings['connection_method'] == 'ssh_tunnel':
                ssh_setting = dict(ssh_username=self.settings['ssh_username'])
                if self.settings['ssh_pkey'] is not None:
                    ssh_setting['ssh_pkey'] = self.settings['ssh_pkey']
                else:
                    ssh_setting['ssh_password'] = self.settings['ssh_password']

                # Find an available local port
                local_port = port
                max_local_port = local_port + 100
                while is_port_in_use(local_port):
                    if local_port > max_local_port:
                        raise Exception(
                            'Unable to find an open port, please clear your running processes '
                            'if possible.'
                        )
                    local_port += 1
                self.ssh_tunnel = SSHTunnelForwarder(
                    (self.settings['ssh_host'], self.settings['ssh_port']),
                    remote_bind_address=(host, port),
                    local_bind_address=('', local_port),
                    **ssh_setting,
                )
                self.ssh_tunnel.start()
                self.ssh_tunnel._check_is_started()

                host = '127.0.0.1'
                port = self.ssh_tunnel.local_bind_port

            connect_opts = dict(
                database=database,
                host=host,
                password=password,
                port=port,
                user=user,
                keepalives=1,
                keepalives_idle=300,
            )

            if self.settings.get('connect_timeout'):
                connect_opts['connect_timeout'] = self.settings['connect_timeout']

            try:
                self._ctx = connect(**connect_opts)
            except Exception:
                if self.ssh_tunnel is not None:
                    self.ssh_tunnel.stop()
                    self.ssh_tunnel = None

    def close(self) -> None:
        """
        Close the underlying connection to the SQL data source if open. Else will do nothing.
        """
        if '_ctx' in self.__dict__:
            self._ctx.close()
            del self._ctx
        if self.ssh_tunnel is not None:
            self.ssh_tunnel.stop()
            self.ssh_tunnel = None
        if self.verbose and self.printer.exists_previous_message:
            print('')

    def table_exists(self, schema_name: str, table_name: str) -> bool:
        with self.conn.cursor() as cur:
            cur.execute(
                f'SELECT * FROM pg_tables WHERE schemaname = \'{schema_name}\' AND '
                f'tablename = \'{table_name}\''
            )
            return bool(cur.rowcount)

    def get_type(self, column: Series, dtype: str) -> str:
        if dtype in (
            PandasTypes.MIXED,
            PandasTypes.UNKNOWN_ARRAY,
            PandasTypes.COMPLEX,
        ):
            series = column[column.notnull()]
            values = series.values

            column_type = None

            if len(values) >= 1:
                column_type = 'JSONB'

                values_not_empty_list = [v for v in values if type(v) is not list or v]
                if not values_not_empty_list:
                    # All values are empty list
                    return column_type
                value = values_not_empty_list[0]
                if type(value) is list:
                    if len(value) >= 1:
                        item = value[0]
                        if type(item) is dict:
                            column_type = 'JSONB'
                        else:
                            item_series = pd.Series(data=item)
                            item_dtype = item_series.dtype
                            if PandasTypes.OBJECT != item_dtype:
                                item_type = self.get_type(item_series, item_dtype)
                                column_type = f'{item_type}[]'
                            else:
                                column_type = 'text[]'
                    else:
                        column_type = 'text[]'

            if column_type:
                return column_type

            raise BadConversionError(
                f'Cannot convert column \'{column.name}\' with data type \'{dtype}\' to '
                'a PostgreSQL datatype.'
            )
        elif dtype in (PandasTypes.DATETIME, PandasTypes.DATETIME64):
            try:
                if column.dt.tz:
                    return 'timestamptz'
            except AttributeError:
                pass
            return 'timestamp'
        elif dtype == PandasTypes.TIME:
            try:
                if column.dt.tz:
                    return 'timetz'
            except AttributeError:
                pass
            return 'time'
        elif dtype == PandasTypes.DATE:
            return 'date'
        elif dtype == PandasTypes.STRING:
            return 'text'
        elif dtype == PandasTypes.CATEGORICAL:
            return 'text'
        elif dtype == PandasTypes.BYTES:
            return 'bytea'
        elif dtype in (PandasTypes.FLOATING, PandasTypes.DECIMAL, PandasTypes.MIXED_INTEGER_FLOAT):
            return 'double precision'
        elif dtype == PandasTypes.INTEGER or dtype == PandasTypes.INT64:
            max_int, min_int = column.max(), column.min()
            if np.int16(max_int) == max_int and np.int16(min_int) == min_int:
                return 'smallint'
            elif np.int32(max_int) == max_int and np.int32(min_int) == min_int:
                return 'integer'
            else:
                return 'bigint'
        elif dtype == PandasTypes.BOOLEAN:
            return 'boolean'
        elif dtype in (PandasTypes.TIMEDELTA, PandasTypes.TIMEDELTA64, PandasTypes.PERIOD):
            return 'bigint'
        elif dtype == PandasTypes.EMPTY:
            return 'text'
        elif PandasTypes.OBJECT == dtype:
            return 'JSONB'
        else:
            print(f'Invalid datatype provided: {dtype}')

        return 'text'

    def upload_dataframe(
        self,
        cursor: _psycopg.cursor,
        df: DataFrame,
        db_dtypes: List[str],
        dtypes: List[str],
        full_table_name: str,
        buffer: Union[IO, None] = None,
        allow_reserved_words: bool = False,
        unique_conflict_method: str = None,
        unique_constraints: List[str] = None,
    ) -> None:
        if unique_constraints and unique_conflict_method:
            use_insert_command = True
        else:
            # Use COPY command
            use_insert_command = False

        def clean_array_value(val):
            if val is None or type(val) is not str or len(val) < 2:
                return val
            if val[0] == '[' and val[-1] == ']':
                return '{' + val[1:-1] + '}'
            return val

        def serialize_obj(val):
            if type(val) is dict:
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
            elif not use_insert_command and type(val) is list:
                return clean_array_value(simplejson.dumps(
                    val,
                    default=encode_complex,
                    ignore_nan=True,
                ))
            return val

        df_ = df.copy()
        columns = df_.columns

        for col in columns:
            df_col_dropna = df_[col].dropna()
            if df_col_dropna.count() == 0:
                continue
            if dtypes[col] == PandasTypes.OBJECT \
                    or (df_[col].dtype == PandasTypes.OBJECT and
                        type(df_col_dropna.iloc[0]) != str):
                df_[col] = df_[col].apply(lambda x: serialize_obj(x))
        df_.replace({np.NaN: None}, inplace=True)

        insert_columns = ', '.join([f'"{col}"'for col in columns])

        if use_insert_command:
            # Use INSERT command
            values_placeholder = ', '.join(["%s" for i in range(len(columns))])
            values = []
            for i, row in df_.iterrows():
                values.append(tuple(row))
            commands = [
                f'INSERT INTO {full_table_name} ({insert_columns})',
                f'VALUES ({values_placeholder})',
            ]

            unique_constraints = \
                [f'"{self._clean_column_name(col, allow_reserved_words=allow_reserved_words)}"'
                 for col in unique_constraints]
            columns_cleaned = \
                [f'"{self._clean_column_name(col, allow_reserved_words=allow_reserved_words)}"'
                 for col in columns]

            commands.append(f"ON CONFLICT ({', '.join(unique_constraints)})")
            if UNIQUE_CONFLICT_METHOD_UPDATE == unique_conflict_method:
                update_command = [f'{col} = EXCLUDED.{col}' for col in columns_cleaned]
                commands.append(
                    f"DO UPDATE SET {', '.join(update_command)}",
                )
            else:
                commands.append('DO NOTHING')
            cursor.executemany('\n'.join(commands), values)
        else:
            # Use COPY command
            df_.to_csv(
                buffer,
                header=False,
                index=False,
                na_rep='',
            )
            buffer.seek(0)
            cursor.copy_expert(f"""
COPY {full_table_name} ({insert_columns}) FROM STDIN (
    FORMAT csv
    , DELIMITER \',\'
    , NULL \'\'
    , FORCE_NULL({insert_columns})
);
        """, buffer)
