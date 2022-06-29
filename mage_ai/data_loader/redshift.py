from mage_ai.data_loader.base import BaseSQL
from pandas import DataFrame
from redshift_connector import connect


class Redshift(BaseSQL):
    """
    Loads data from a Redshift data warehouse.
    """

    def __init__(self, **kwargs) -> None:
        """
        Initializes settings for connecting to a Redshift warehouse.
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
            *args, **kwargs: Additional parameters to send to query, including format strings.

        Returns:
            DataFrame: Data frame associated with the given query.
        """
        with self.conn.cursor() as cur:
            return cur.execute(query_string, *args, **kwargs).fetch_dataframe()

    @classmethod
    def with_credentials(
        cls, database: str, host: str, user: str, password: str, port: int = 5439, **kwargs
    ):
        """
        Creates a Redshift data loader from temporary database credentials

        Args:
            database (str): Name of the database to connect to
            host (str): The hostname of the Redshift cluster which the database belongs to
            user (str): Username for authentication
            password (str): Password for authentication
            port (int, optional): Port number of the Redshift cluster. Defaults to 5439.

        Returns:
            Redshift: the constructed dataloader using this method
        """
        return cls(database=database, host=host, user=user, password=password, port=port, **kwargs)

    @classmethod
    def with_iam(
        cls,
        cluster_identifier: str,
        database: str,
        db_user: str,
        profile: str = 'default',
        **kwargs
    ):
        """
        Creates a Redshift data loader using a profile from `~/.aws/credentials`. If credentials
        not stored on system or not found by the connector, use `with_credentials` to construct
        the data loader.

        Args:
            cluster_identifier (str): Identifier of the cluster to connect to.
            database (str): The database to connect to within the specified cluster.
            db_user (str): Database username
            profile (str, optional): The profile to use from stored credentials file. Defaults to 'default'.

        Returns:
            Redshift: the constructed dataloader using this method
        """
        return cls(
            cluster_identifier=cluster_identifier,
            database=database,
            profile=profile,
            db_user=db_user,
            iam=True,
            **kwargs
        )
