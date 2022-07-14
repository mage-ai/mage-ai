from io import StringIO
from mage_ai.io.base import BaseSQL, QUERY_ROW_LIMIT, TableExistsError, TableExportPolicy
from mage_ai.io.io_config import IOConfigKeys
from mage_ai.io.type_handler import gen_table_creation_query, map_to_postgres
from pandas import DataFrame, read_sql
from psycopg2 import connect
from typing import Any, Mapping, Union


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
            self._ctx = connect(**self.settings)

    def query(self, query_string: str, **query_vars) -> None:
        """
        Sends query to the connected database.

        Args:
            query_string (str): SQL query string to apply on the connected database.
            query_vars: Variable values to fill in when using format strings in query.
        """
        with self.printer.print_msg(f'Executing query \'{query_string}\''):
            with self.conn.cursor() as cur:
                cur.execute(query_string, **query_vars)

    def load(self, query_string: str, limit: int = QUERY_ROW_LIMIT, **kwargs) -> DataFrame:
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
        with self.printer.print_msg(f'Loading data frame with query \'{query_string}\''):
            return read_sql(self._enforce_limit(query_string, limit), self.conn, **kwargs)

    def export(
        self,
        df: DataFrame,
        table_name: str,
        index: bool = False,
        if_exists: Union[TableExportPolicy, str] = 'replace',
        **kwargs,
    ) -> None:
        """
        Exports dataframe to the connected database from a Pandas data frame.  If table doesn't
        exist, the table is automatically created.

        Args:
            table_name (str): Name of the table to insert rows from this data frame into.
            index (bool): If true, the data frame index is also exported alongside the table. Defaults to False.
            if_exists (str): Specifies export policy if table exists. Either
                - `'fail'`: throw an error.
                - `'replace'`: drops existing table and creates new table of same name.
                - `'append'`: appends data frame to existing table. In this case the schema must match the original table.
            Defaults to `'replace'`.
            **kwargs: Additional query parameters.
        """
        with self.printer.print_msg(f'Exporting data frame to table \'{table_name}\''):
            buffer = StringIO()
            with self.conn.cursor() as cur:
                cur.execute(
                    f'SELECT * FROM information_schema.tables WHERE table_name = \'{table_name}\''
                )
                exists = cur.rowcount
                if exists:
                    if if_exists == TableExportPolicy.FAIL:
                        raise TableExistsError(f'Table \'{table_name}\' already exists in database')
                    elif if_exists == TableExportPolicy.REPLACE:
                        cur.execute(f'DELETE FROM {table_name}')
                else:
                    # TODO find a way to integrate column modifiers
                    query = gen_table_creation_query(df, map_to_postgres, table_name)
                    cur.execute(query)

                df.to_csv(buffer, index=index, header=False)
                buffer.seek(0)
                cur.copy_from(buffer, table=table_name, sep=',', null='')
            self.conn.commit()

    @classmethod
    def with_config(cls, config: Mapping[str, Any]) -> 'Postgres':
        try:
            return cls(**config[IOConfigKeys.POSTGRES])
        except KeyError:
            raise KeyError(
                f'No configuration settings found for \'{IOConfigKeys.POSTGRES}\' under profile'
            )
