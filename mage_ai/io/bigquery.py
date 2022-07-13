from google.cloud.bigquery import Client, LoadJobConfig, WriteDisposition
from google.oauth2 import service_account
from mage_ai.io.base import BaseIO, QUERY_ROW_LIMIT
from mage_ai.io.io_config import IOConfigKeys
from pandas import DataFrame
from typing import Any, Mapping


class BigQuery(BaseIO):
    """
    Handles data transfer betwee a BigQuery data warehouse and the Mage app.
    """

    def __init__(self, **kwargs) -> None:
        """
        Initializes settings for connecting to a BigQuery warehouse.

        To authenticate (and authorize) access to a BigQuery warehouse, credentials must be provided.
        Below are the different ways in which the BigQuery data loader can access those
        credentials:
        - Define the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to a
          service account key. In this case no other no other parameters need to be
          specified.
        - Manually pass in the `google.oauth2.service_account.Credentials` object with the
        keyword argument `credentials`
        - Manually pass in the path to the credentials with the keyword argument
        `path_to_credentials`.
        - Manually define the service key key-value set to use (such as a dictionary containing
        the same parameters as a service key) with the keyword argument `credentials_mapping`

        All keyword arguments except for `path_to_credentials` and `credentials_mapping` will be passed
        to the Google BigQuery client, accepting all other configuration settings there.
        """
        super().__init__()
        credentials = kwargs.get('credentials')
        if credentials is None:
            if 'credentials_mapping' in kwargs:
                mapping_obj = kwargs.pop('credentials_mapping')
                if mapping_obj is not None:
                    credentials = service_account.Credentials.from_service_account_info(mapping_obj)
            if 'path_to_credentials' in kwargs:
                path = kwargs.pop('path_to_credentials')
                if path is not None:
                    credentials = service_account.Credentials.from_service_account_file(path)
            if 'credentials' in kwargs:
                kwargs.pop('credentials')
        with self.printer.print_msg(f'Connecting to BigQuery warehouse'):
            self.client = Client(credentials=credentials, **kwargs)

    def load(self, query_string: str, limit: int = QUERY_ROW_LIMIT, **kwargs) -> DataFrame:
        """
        Loads data from BigQuery into a Pandas data frame based on the query given.
        This will fail if the query returns no data from the database. When a select query
        is provided, this function will load at maximum 100,000 rows of data. To operate on more data,
        consider performing data transformations in warehouse.



        Args:
            query_string (str): Query to fetch a table or subset of a table.
            limit (int, Optional): The number of rows to limit the loaded dataframe to. Defaults to 100000.
            **kwargs: Additional arguments to pass to query, such as query configurations

        Returns:
            DataFrame: Data frame associated with the given query.
        """
        with self.printer.print_msg(f'Loading data frame with query \'{query_string}\''):
            return self.client.query(
                self._enforce_limit(query_string, limit), *kwargs
            ).to_dataframe()

    def export(
        self,
        df: DataFrame,
        table_id: str,
        if_exists: str = 'replace',
        **configuration_params,
    ) -> None:
        """
        Exports a data frame to a Google BigQuery warehouse.  If table doesn't
        exist, the table is automatically created.

        Args:
            df (DataFrame): Data frame to export
            table_id (str): ID of the table to export the data frame to. If of the format
            `"your-project.your_dataset.your_table_name"`. If this table exists,
            the table schema must match the data frame schema. If this table doesn't exist,
            the table schema is automatically inferred.
            if_exists (str): Specifies export policy if table exists. Either
                - `'fail'`: throw an error.
                - `'replace'`: drops existing table and creates new table of same name.
                - `'append'`: appends data frame to existing table. In this case the schema must match the original table.
            Defaults to `'replace'`. If `write_disposition` is specified as a keyword argument, this parameter
            is ignored (as both define the same functionality).
            **configuration_params: Configuration parameters for export job
        """
        with self.printer.print_msg(f'Exporting data frame to table \'{table_id}\''):
            config = LoadJobConfig(**configuration_params)
            if 'write_disposition' not in configuration_params:
                if if_exists == 'replace':
                    config.write_disposition = WriteDisposition.WRITE_TRUNCATE
                elif if_exists == 'append':
                    config.write_disposition = WriteDisposition.WRITE_APPEND
                elif if_exists == 'fail':
                    config.write_disposition = WriteDisposition.WRITE_EMPTY
                else:
                    raise ValueError(
                        f'Invalid policy specified for handling existence of table: \'{if_exists}\''
                    )
            self.client.load_table_from_dataframe(df, table_id, job_config=config).result()

    @classmethod
    def with_config(cls, config: Mapping[str, Any]) -> 'BigQuery':
        try:
            return cls(**config[IOConfigKeys.BIGQUERY])
        except KeyError:
            raise KeyError(
                f'No configuration settings found for \'{IOConfigKeys.BIGQUERY}\' under profile'
            )

    @classmethod
    def with_credentials_file(cls, path_to_credentials: str, **kwargs) -> 'BigQuery':
        """
        Constructs BigQuery data loader using the file containing the service account key.

        Args:
            path_to_credentials (str): Path to the credentials file.

        Returns:
            BigQuery: BigQuery data loader
        """
        return cls(path_to_credentials=path_to_credentials, **kwargs)

    @classmethod
    def with_credentials_object(cls, credentials: Mapping[str, str], **kwargs) -> 'BigQuery':
        """
        Constructs BigQuery data loader using manually specified authentication credentials object.

        Args:
            credentials (Mapping[str, str]): Credentials object. Must contain all the OAuth information necessary
            to authenticate and authorize BigQuery access. This should resemble a service account key.

        Returns:
            BigQuery: BigQuery data loader
        """
        return cls(credentials_mapping=credentials, **kwargs)
