from mage_ai.data_loader.base import BaseSQL
from pandas import DataFrame
from redshift_connector import connect


class Redshift(BaseSQL):
    """
    Loads data from a Redshift data warehouse.
    """

    @classmethod
    def with_credentials(
        cls, database: str, host: str, user: str, password: str, port: int, **kwargs
    ):
        return cls(database=database, host=host, user=user, password=password, port=port, **kwargs)

    def with_iam(cls, profile: str, iam: bool = True, **kwargs):
        return cls(profile=profile, iam=iam, **kwargs)

    def __init__(self, **kwargs) -> None:
        """
        Initializes settings for connecting to a Redshift warehouse. Depending how authentication and authorization is performed,
        below are the parameters that should be provided:
        - Database Login with Username and Password: Provide
            - host (str): Path to the Redshift cluster.
            - database (str): The name of the database to access within the cluster.
            - user (str): The username to access the database
            - password (str): The password to access the database
        - IAM Credentials Login: Provide
            - iam (bool): Set this to true to indicate that IAM credentials should be used.
            - cluster_identifier (str): The name of the cluster to connect to.
            - database (str): The name of the database to access within the cluster.
            - profile (str): The name of the profile to use when accessing the Redshift cluster, as specified in the credentials file.

        If IAM credentials not stored on system or not found by the connector, manually specify the credentials as arguments.
        """
        super().__init__(**kwargs)

    def open(self) -> None:
        """
        Opens a connection to the Redshift warehouse.
        """
        self._ctx = connect(**self.settings)

    def query(self, query_string: str, **kwargs) -> None:
        """
        Executes any query on the Redshift warehouse.

        Args:
            query_string (str): The query to execute on the Redshift warehouse.
            **kwargs: Additional parameters to pass to the query.
        """
        with self.conn.cursor() as cur:
            return cur.execute(query_string, **kwargs)

    def load(self, query_string: str, *args, **kwargs) -> DataFrame:
        """
        Loads data from Redshift into a Pandas data frame based on the query given.
        This will fail if the query returns no data from the database.

        Args:
            query_string (str): Query to fetch a table or subset of a table.

        Returns:
            DataFrame: Data frame associated with the given query.
        """
        with self.conn.cursor() as cur:
            return cur.execute(query_string, *args, **kwargs).fetch_dataframe()
