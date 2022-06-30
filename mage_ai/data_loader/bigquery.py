from google.cloud.bigquery import Client
from google.oauth2 import service_account
from mage_ai.data_loader.base import BaseLoader
from pandas import DataFrame
from typing import Mapping
import json


class BigQuery(BaseLoader):
    """
    Loads data from a BigQuery data warehouse.
    """

    def __init__(self, **kwargs) -> None:
        """
        Initializes settings for connecting to a BigQuery warehouse.

        To authenticate access to a BigQuery warehouse, credentials must be provided.
        Below are the different ways in which the BigQuery data loader can access those
        credentials:
        - Define the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to a
          service account key. In this case no other no other parameters need to be
          specified.
        - Manually pass in the path to the credentials file. Construct the data loader
          using the factory method `with_credentials_file`.
        - Manually define the credentials mapping object to use. Construct the data loader
          using the factory method `with_credentials_object`.
        """
        self.client = Client(**kwargs)

    def load(self, query_string: str, **kwargs) -> DataFrame:
        """
        Loads data from BigQuery into a Pandas data frame based on the query given.
        This will fail if the query returns no data from the database.

        Args:
            query_string (str): Query to fetch a table or subset of a table.
            **kwargs: Additional arguments to pass to query, such as query configurations

        Returns:
            DataFrame: Data frame associated with the given query.
        """
        return self.client.query(query_string, *kwargs).to_dataframe()

    @classmethod
    def with_credentials_file(cls, path_to_credentials: str, **kwargs):
        """
        Constructs BigQuery data loader using the file containing the service account key.

        Args:
            path_to_credentials (str): Path to the credentials file.

        Returns:
            BigQuery: BigQuery data loader
        """
        with open(path_to_credentials, 'r') as fin:
            mapping = json.loads(fin.read().replace('\n', ''))
        return cls.with_credentials_object(mapping, **kwargs)

    @classmethod
    def with_credentials_object(cls, credentials: Mapping[str, str], **kwargs):
        """
        Constructs BigQuery data loader using manually specified authentication credentials object.

        Args:
            credentials (Mapping[str, str]): Credentials object. Must contain all the OAuth information necessary
            to authenticate and authorize BigQuery access. This should resemble a service account key.

        Returns:
            BigQuery: BigQuery data loader
        """
        return cls(
            credentials=service_account.Credentials.from_service_account_info(credentials), **kwargs
        )
