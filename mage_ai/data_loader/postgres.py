from mage_ai.data_loader.base import BaseSQL
from pandas import DataFrame, read_sql
from psycopg2 import connect
from typing import Mapping, Sequence, Union


class Postgres(BaseSQL):
    """
    Loads data from a PostgreSQL database.
    """

    def __init__(self, **kwargs) -> None:
        """
        Initializes the data loader. Below are some sample arguments, for the full
        list see libpq parameter keywords.

        Args:
            dbname (str): The name of the database to connect to.
            user (str): The user with which to connect to the database with.
            password (str): The login password for the user.
            host (str): Path to host address for database.
            port (str): Port on which the database is running.
        """
        super().__init__(**kwargs)

    def open(self) -> None:
        """
        Opens a connection to the PostgreSQL database specified by the parameters.
        """
        self._ctx = connect(**self.settings)

    def query(self, query_string: str, query_vars: Union[Sequence, Mapping] = None) -> None:
        """
        Sends query to the connected database.

        Args:
            query_string (str): SQL query string to apply on the connected database.
            query_vars (Union[Sequence, Mapping], optional): Variable values to fill
            in when using format strings in query. Defaults to None.
        """
        with self.conn.cursor() as cur:
            return cur.execute(query_string, query_vars)

    def load(self, query_string: str, **kwargs) -> DataFrame:
        """
        Loads data from the connected database into a Pandas data frame based on the query given.
        This will fail if the query returns no data from the database.

        Args:
            query_string (str): Query to execute on the database.
            **kwargs: Additional query parameters.

        Returns:
            DataFrame: The data frame corresponding to the data returned by the given query.
        """
        return read_sql(query_string, self.conn, **kwargs)
