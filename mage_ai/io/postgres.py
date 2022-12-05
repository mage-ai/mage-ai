from io import StringIO
from mage_ai.io.base import BaseSQLConnection, ExportWritePolicy, QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import (
    BadConversionError,
    clean_df_for_export,
    gen_table_creation_query,
    infer_dtypes,
    PandasTypes,
)
from pandas import DataFrame, read_sql, Series
from psycopg2 import connect
import numpy as np


class Postgres(BaseSQLConnection):
    """
    Handles data transfer between a PostgreSQL database and the Mage app.
    """

    def __init__(
        self,
        dbname: str,
        user: str,
        password: str,
        host: str,
        port: str = None,
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
        super().__init__(
            verbose=verbose,
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port,
            **kwargs,
        )

    def open(self) -> None:
        """
        Opens a connection to the PostgreSQL database specified by the parameters.
        """
        with self.printer.print_msg('Opening connection to PostgreSQL database'):
            self._ctx = connect(**self.settings,
                keepalives=1,
                keepalives_idle=300,
            )

    def execute(self, query_string: str, **query_vars) -> None:
        """
        Sends query to the connected database.

        Args:
            query_string (str): SQL query string to apply on the connected database.
            query_vars: Variable values to fill in when using format strings in query.
        """
        with self.printer.print_msg(f'Executing query \'{query_string}\''):
            query_string = self._clean_query(query_string)
            with self.conn.cursor() as cur:
                cur.execute(query_string, **query_vars)

    def load(
        self,
        query_string: str,
        limit: int = QUERY_ROW_LIMIT,
        display_query: str = None,
        verbose: bool = True,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from the connected database into a Pandas data frame based on the query given.
        This will fail if the query returns no data from the database. This function will load at
        maximum 100,000 rows of data. To operate on more data, consider performing data
        transformations in warehouse.

        Args:
            query_string (str): Query to execute on the database.
            limit (int, Optional): The number of rows to limit the loaded dataframe to. Defaults to 100000.
            **kwargs: Additional query parameters.

        Returns:
            DataFrame: The data frame corresponding to the data returned by the given query.
        """
        print_message = 'Loading data'
        if verbose:
            print_message += ' with query'

            if display_query:
                for line in display_query.split('\n'):
                    print_message += f'\n{line}'
            else:
                print_message += f'\n{query_string}'

        query_string = self._clean_query(query_string)

        with self.printer.print_msg(print_message):
            return read_sql(self._enforce_limit(query_string, limit), self.conn, **kwargs)

    def export(
        self,
        df: DataFrame,
        schema_name: str,
        table_name: str,
        if_exists: ExportWritePolicy = ExportWritePolicy.REPLACE,
        index: bool = False,
        verbose: bool = True,
        query_string: str = None,
        drop_table_on_replace: bool = False,
        cascade_on_drop: bool = False,
    ) -> None:
        """
        Exports dataframe to the connected database from a Pandas data frame. If table doesn't
        exist, the table is automatically created. If the schema doesn't exist, the schema is also created.

        Args:
            schema_name (str): Name of the schema of the table to export data to.
            table_name (str): Name of the table to insert rows from this data frame into.
            if_exists (ExportWritePolicy): Specifies export policy if table exists. Either
                - `'fail'`: throw an error.
                - `'replace'`: drops existing table and creates new table of same name.
                - `'append'`: appends data frame to existing table. In this case the schema must match the original table.
            Defaults to `'replace'`.
            index (bool): If true, the data frame index is also exported alongside the table. Defaults to False.
            **kwargs: Additional query parameters.
        """

        full_table_name = f'{schema_name}.{table_name}'

        if not query_string:
            if index:
                df = df.reset_index()

            dtypes = infer_dtypes(df)
            df = clean_df_for_export(df, self.clean, dtypes)

        def __process():
            buffer = StringIO()
            table_exists = self.__table_exists(schema_name, table_name)

            with self.conn.cursor() as cur:
                cur.execute(f'CREATE SCHEMA IF NOT EXISTS {schema_name};')

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
                        db_dtypes = {col: self.get_type(df[col], dtypes[col]) for col in dtypes}
                        query = gen_table_creation_query(db_dtypes, schema_name, table_name)
                        cur.execute(query)

                    df.to_csv(buffer, index=False, header=False)
                    buffer.seek(0)
                    cur.copy_expert(
                        f'COPY {full_table_name} FROM STDIN (FORMAT csv, DELIMITER \',\', NULL \'\');',
                        buffer,
                    )
            self.conn.commit()

        if verbose:
            with self.printer.print_msg(
                f'Exporting data to \'{full_table_name}\''
            ):
                __process()
        else:
            __process()

    def __table_exists(self, schema_name: str, table_name: str) -> bool:
        """
        Returns whether the specified table exists.

        Args:
            schema_name (str): Name of the schema the table belongs to.
            table_name (str): Name of the table to check existence of.

        Returns:
            bool: True if the table exists, else False.
        """
        with self.conn.cursor() as cur:
            cur.execute(
                f'SELECT * FROM pg_tables WHERE schemaname = \'{schema_name}\' AND tablename = \'{table_name}\''
            )
            return bool(cur.rowcount)

    def clean(self, column: Series, dtype: str) -> Series:
        """
        Cleans column in order to write data frame to PostgreSQL database

        Args:
            column (Series): Column to clean
            dtype (str): The pandas data types of this column

        Returns:
            Series: Cleaned column
        """
        if dtype == PandasTypes.CATEGORICAL:
            return column.astype(str)
        elif dtype in (PandasTypes.TIMEDELTA, PandasTypes.TIMEDELTA64, PandasTypes.PERIOD):
            return column.view(int)
        else:
            return column

    def get_type(self, column: Series, dtype: str) -> str:
        """
        Maps pandas Data Frame column to PostgreSQL type

        Args:
            series (Series): Column to map
            dtype (str): Pandas data type of this column

        Raises:
            ConversionError: Returned if this type cannot be converted to a PostgreSQL data type

        Returns:
            str: PostgreSQL data type for this column
        """
        if dtype in (
            PandasTypes.MIXED,
            PandasTypes.UNKNOWN_ARRAY,
            PandasTypes.COMPLEX,
        ):
            raise BadConversionError(
                f'Cannot convert column \'{column.name}\' with data type \'{dtype}\' to a PostgreSQL datatype.'
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
        else:
            raise ValueError(f'Invalid datatype provided: {dtype}')

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'Postgres':
        """
        Initializes PostgreSQL loader from configuration loader

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        return cls(
            dbname=config[ConfigKey.POSTGRES_DBNAME],
            user=config[ConfigKey.POSTGRES_USER],
            password=config[ConfigKey.POSTGRES_PASSWORD],
            host=config[ConfigKey.POSTGRES_HOST],
            port=config[ConfigKey.POSTGRES_PORT],
        )
