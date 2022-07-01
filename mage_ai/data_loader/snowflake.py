from mage_ai.data_loader.base import BaseSQL
from pandas import DataFrame
from snowflake.connector import connect


class Snowflake(BaseSQL):
    """
    Loads data from a Snowflake data warehouse.
    """

    def __init__(self, **kwargs) -> None:
        """
        Initializes settings for connecting to Snowflake data warehouse.
        The following arguments must be provided to the connector, all other
        arguments are optional.

        Required Arguments:
            user (str): Username for the Snowflake user.
            password (str): Login Password for the user.
            account (str): Snowflake account identifier (excluding
            `snowflake-computing.com` suffix).
        """
        super().__init__(**kwargs)

    def open(self) -> None:
        """
        Opens a connection to Snowflake.
        """
        self._ctx = connect(**self.settings)

    def query(self, query_string: str, **kwargs) -> None:
        """
        Executes any query in the Snowflake data warehouse.

        Args:
            query_string (str): The query to execute on Snowflake's platform.
            **kwargs: Additional parameters to provide to the query
        """
        with self.conn.cursor() as cur:
            return cur.execute(query_string, **kwargs)

    def load(self, query_string: str, *args, **kwargs) -> DataFrame:
        """
        Loads data from Snowflake into a Pandas data frame based on the query given.
        This will fail unless a `SELECT` query is provided.

        Args:
            query_string (str): Query to fetch a table or subset of a table.
            *args, **kwargs: Additional parameters to provide to the query

        Returns:
            DataFrame: Data frame associated with the given query.
        """
        with self.conn.cursor() as cur:
            return cur.execute(query_string, *args, **kwargs).fetch_pandas_all()
