from mage_ai.data_loader.base import BaseSQL
from pandas import DataFrame
from databricks.sql.client import connect


class Databricks(BaseSQL):
    """
    Loads data from a Snowflake data warehouse.
    """

    def __init__(self, **kwargs) -> None:
        """
        Initializes settings for connecting to Databricks clusters and SQL endpoints. The following arguments must be provided
        to the connector, all other arguments are optional.

        Required Arguments:
            server_hostname (str): The server hostname of the cluster or SQL endpoint.
            http_path (str): The HTTP path to the cluster or SQL endpoint.
            access_token (str): Databricks personal access token.
        """
        super().__init__(**kwargs)

    def open(self) -> None:
        """
        Opens a connection to a Databricks cluster or SQL endpoint.
        """
        self._ctx = connect(
            self.settings['server_hostname'],
            self.settings['http_path'],
            self.settings['access_token'],
            **self.settings
        )

    def query(self, query_string: str, **kwargs) -> None:
        """
        Executes any query in the Databricks cluster/SQL endpoint.

        Args:
            query_string (str): The query to execute on Databricks cluster/SQL endpoint.
            **kwargs: Additional parameters to pass to the query.
        """
        with self.conn.cursor() as cur:
            return cur.execute(query_string, **kwargs)

    def load(self, query_string: str, *args, **kwargs) -> DataFrame:
        """
        Loads data from Databricks into a Pandas data frame based on the query given.
        This will fail if the query returns no data from the database.

        Args:
            query_string (str): Query to fetch a table or subset of a table.

        Returns:
            DataFrame: Data frame associated with the given query.
        """
        with self.conn.cursor() as cur:
            cur.execute(query_string, *args, **kwargs)
            columns = [col[0] for col in cur.description()]
            data = cur.fetchall()
            return DataFrame(data=data, columns=columns)
