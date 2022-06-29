from mage_ai.data_loader.base import BaseSQL
from pandas import DataFrame, read_sql
from psycopg2 import connect


class Postgres(BaseSQL):
    """
    Loads data from a PostgreSQL database.
    """

    def __init__(self, **kwargs) -> None:
        """
        Initializes the data loader. Below are some sample arguments, for the full list see libpq parameter keywords.

        Args:
            dbname (str): The name of the database to connect to.
            user (str): The user with which to connect to the database with.
            password (str): The login password for the above user. Defaults to None (as for users with no login password).
            host (str): Path to host address for database. Defaults to None (as for in-memory datasets).
            port (str): Port on which the database is running. Defaults to None (as for in-memory datasets).
        """
        super().__init__(**kwargs)

    def open(self) -> None:
        """
        Opens a connection to the PostgreSQL database specified by the parameters.
        """
        self._ctx = connect(**self.settings)

    def query(self, query_string: str, vars=None):
        """
        Queries the database to perform some query action.

        Args:
            query_string (str): SQL query string to apply on the connected database.
            *args, **kwargs: Additional query parameters.
        """
        with self.conn.cursor() as cur:
            return cur.execute(query_string, vars)

    def load(self, query_string: str, **kwargs) -> DataFrame:
        """
        Loads data from the connected database into a Pandas data frame based on the query given.
        This will fail if the query returns no data from the database.

        Args:
            query_string (str): Query to execute on the database.
            **kwargs: Additional query parameters.

        Returns:
            DataFrame: The dataframe corresponding to the subtable returned by the given query.
        """
        return read_sql(query_string, self.conn, **kwargs)
