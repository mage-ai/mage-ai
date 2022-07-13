from mage_ai.io.base import BaseSQL, QUERY_ROW_LIMIT
from mage_ai.io.io_config import IOConfigKeys
from pandas import DataFrame, read_sql
from sqlalchemy import create_engine
from typing import Any, Mapping


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
        self.dburl = (
            f'postgresql+psycopg2://{user}:{password}@{host}{":"+port if port else ""}/{dbname}'
        )
        super().__init__(verbose=verbose, **kwargs)

    def open(self) -> None:
        """
        Opens a connection to the PostgreSQL database specified by the parameters.
        """
        with self.printer.print_msg('Opening connection to PostgreSQL database'):
            self._ctx = create_engine(self.dburl, **self.settings).connect(**self.settings)

    def query(self, query_string: str, **query_vars) -> None:
        """
        Sends query to the connected database.

        Args:
            query_string (str): SQL query string to apply on the connected database.
            query_vars: Variable values to fill in when using format strings in query.
        """
        with self.printer.print_msg(f'Executing query \'{query_string}\''):
            self.conn.execute(query_string, **query_vars)

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
        self, df: DataFrame, name: str, index: bool = False, if_exists: str = 'replace', **kwargs
    ) -> None:
        """
        Exports dataframe to the connected database from a Pandas data frame.  If table doesn't
        exist, the table is automatically created.

        Args:
            name (str): Name of the table to insert rows from this data frame into.
            index (bool): If true, the data frame index is also exported alongside the table. Defaults to False.
            if_exists (str): Specifies export policy if table exists. Either
                - `'fail'`: throw an error.
                - `'replace'`: drops existing table and creates new table of same name.
                - `'append'`: appends data frame to existing table. In this case the schema must match the original table.
            Defaults to `'replace'`.
            **kwargs: Additional query parameters.
        """
        with self.printer.print_msg(f'Exporting data frame to table \'{name}\''):
            df.to_sql(name, self.conn, index=index, if_exists=if_exists, **kwargs)
        df.to_sql(name, self.conn, index=index, if_exists=if_exists, **kwargs)

    @classmethod
    def with_config(cls, config: Mapping[str, Any]) -> 'Postgres':
        try:
            return cls(**config[IOConfigKeys.POSTGRES])
        except KeyError:
            raise KeyError(
                f'No configuration settings found for \'{IOConfigKeys.POSTGRES}\' under profile'
            )
