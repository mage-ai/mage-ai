from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import BadConversionError, PandasTypes
from mage_ai.io.sql import BaseSQL
from mage_ai.shared.utils import is_port_in_use
from pandas import DataFrame, Series
from psycopg2 import connect, _psycopg
from sshtunnel import SSHTunnelForwarder
from typing import Union, IO
import json
import numpy as np
import pandas as pd


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
        connection_method: str = 'direct',
        ssh_host: Union[str, None] = None,
        ssh_port: Union[str, None] = None,
        ssh_username: Union[str, None] = None,
        ssh_password: Union[str, None] = None,
        ssh_pkey: Union[str, None] = None,
        verbose=True,
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
            connection_method=connection_method,
            ssh_host=ssh_host,
            ssh_port=ssh_port,
            ssh_username=ssh_username,
            ssh_password=ssh_password,
            ssh_pkey=ssh_pkey,
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
            connection_method=config[ConfigKey.POSTGRES_CONNECTION_METHOD],
            ssh_host=config[ConfigKey.POSTGRES_SSH_HOST],
            ssh_port=config[ConfigKey.POSTGRES_SSH_PORT],
            ssh_username=config[ConfigKey.POSTGRES_SSH_USERNAME],
            ssh_password=config[ConfigKey.POSTGRES_SSH_PASSWORD],
            ssh_pkey=config[ConfigKey.POSTGRES_SSH_PKEY],
        )

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
            try:
                self._ctx = connect(
                    database=database,
                    host=host,
                    password=password,
                    port=port,
                    user=user,
                    keepalives=1,
                    keepalives_idle=300,
                )
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
                value = values[0]
                column_type = 'JSONB'

                if type(value) is list:
                    if len(value) >= 1:
                        item = value[0]
                        item_series = pd.Series(data=item)
                        item_dtype = item_series.dtype
                        if PandasTypes.OBJECT != item_dtype:
                            item_type = self.get_type(item_series, item_dtype)
                            column_type = f'{item_type}[]'
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
        elif dtype == PandasTypes.INTEGER:
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
        full_table_name: str,
        buffer: Union[IO, None] = None
    ) -> None:
        df_ = df.copy()
        columns = df_.columns

        for col in columns:
            df_col_dropna = df_[col].dropna()
            if df_col_dropna.count() == 0:
                continue
            if PandasTypes.OBJECT == df_[col].dtype and type(df_col_dropna.iloc[0]) != str:
                df_[col] = df_[col].apply(lambda x: json.dumps(x))

        df_.to_csv(
            buffer,
            header=False,
            index=False,
            na_rep='',
        )

        buffer.seek(0)

        columns_names = ', '.join(columns)
        cursor.copy_expert(f"""
COPY {full_table_name} FROM STDIN (
    FORMAT csv
    , DELIMITER \',\'
    , NULL \'\'
    , FORCE_NULL({columns_names})
);
    """, buffer)
