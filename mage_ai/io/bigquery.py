from google.cloud.bigquery import Client, LoadJobConfig, WriteDisposition
from google.oauth2 import service_account
from mage_ai.io.base import BaseSQLDatabase, ExportWritePolicy, QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import infer_dtypes
from mage_ai.shared.utils import (
    convert_pandas_dtype_to_python_type,
    convert_python_type_to_bigquery_type,
)
from pandas import DataFrame
from typing import Mapping


class BigQuery(BaseSQLDatabase):
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
        if kwargs.get('verbose') is not None:
            kwargs.pop('verbose')
        super().__init__(verbose=kwargs.get('verbose', True))

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
        with self.printer.print_msg('Connecting to BigQuery warehouse'):
            self.client = Client(credentials=credentials, **kwargs)

    def alter_table(
        self,
        df: DataFrame,
        table_id: str,
        database: str = None,
        verbose: bool = True,
    ):
        def __process(database):
            parts = table_id.split('.')
            if len(parts) == 2:
                schema, table_name = parts
            elif len(parts) == 3:
                database, schema, table_name = parts

            df_existing = self.client.query(f"""
    SELECT 1
    FROM `{database}.{schema}.__TABLES_SUMMARY__`
    WHERE table_id = '{table_name}'
    """).to_dataframe()

            full_table_name = f'{database}.{schema}.{table_name}'

            table_doesnt_exist = df_existing.empty

            if table_doesnt_exist:
                raise ValueError(f'Table \'{table_id}\' doesn\'t exist.')

            results = self.client.query(f"""
SELECT
    column_name
    , data_type
FROM {schema}.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '{table_name}'
            """)
            current_columns = [r[0].lower() for r in results]

            new_columns = [c for c in df.columns if c.lower() not in current_columns]
            if not new_columns:
                return
            dtypes = infer_dtypes(df)
            dtypes = {k: convert_python_type_to_bigquery_type(convert_pandas_dtype_to_python_type(v))
                      for k, v in dtypes.items()}
            columns_and_types = [
                f"ADD COLUMN {self._clean_column_name(col)} {dtypes[col]}" for col
                in new_columns
            ]
            # TODO: support alter column type and drop columns
            alter_table_command = f"ALTER TABLE {full_table_name} {', '.join(columns_and_types)}"
            self.client.query(alter_table_command)
        if verbose:
            with self.printer.print_msg(f'Altering table \'{table_id}\''):
                __process(database=database)
        else:
            __process(database=database)

    def load(
        self,
        query_string: str,
        limit: int = QUERY_ROW_LIMIT,
        display_query: str = None,
        verbose: bool = True,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from BigQuery into a Pandas data frame based on the query given.
        This will fail if the query returns no data from the database. When a select query
        is provided, this function will load at maximum 10,000,000 rows of data. To operate on more data,
        consider performing data transformations in warehouse.



        Args:
            query_string (str): Query to fetch a table or subset of a table.
            limit (int, Optional): The number of rows to limit the loaded dataframe to. Defaults to 10,000,000.
            **kwargs: Additional arguments to pass to query, such as query configurations

        Returns:
            DataFrame: Data frame associated with the given query.
        """

        print_message = 'Loading data'
        if verbose:
            print_message += ' with query'

            if display_query:
                for line in display_query.split('\n'):
                    print_message += f'\n{line}'
            else:
                print_message += f'\n{query_string}'

        query_string = self._clean_query(query_string)

        with self.printer.print_msg(print_message):
            return self.client.query(
                self._enforce_limit(query_string, limit), *kwargs
            ).to_dataframe()

    def export(
        self,
        df: DataFrame,
        table_id: str,
        database: str = None,
        if_exists: str = 'replace',
        query_string: str = None,
        verbose: bool = True,
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

        def __process(database):
            if query_string:
                parts = table_id.split('.')
                if len(parts) == 2:
                    schema, table_name = parts
                elif len(parts) == 3:
                    database, schema, table_name = parts

                df_existing = self.client.query(f"""
SELECT 1
FROM `{database}.{schema}.__TABLES_SUMMARY__`
WHERE table_id = '{table_name}'
""").to_dataframe()

                full_table_name = f'{database}.{schema}.{table_name}'

                table_doesnt_exist = df_existing.empty

                if ExportWritePolicy.FAIL == if_exists and not table_doesnt_exist:
                    raise ValueError(
                        f'Table \'{full_table_name}\' already exists in database.',
                    )

                if ExportWritePolicy.REPLACE == if_exists:
                    self.client.query(f'DROP TABLE {full_table_name}')
                    command = f'CREATE TABLE {table_id} AS'
                elif table_doesnt_exist:
                    command = f'CREATE TABLE {table_id} AS'
                else:
                    command = f'INSERT INTO {table_id}'

                sql = f"""
{command}
{query_string}
"""
                self.client.query(sql)

            else:
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
                parts = table_id.split('.')
                if len(parts) == 2:
                    schema = parts[0]
                elif len(parts) == 3:
                    schema = parts[1]
                self.client.create_dataset(dataset=schema, exists_ok=True)

                # Clean column names
                if type(df) is DataFrame:
                    df.columns = df.columns.str.replace(' ', '_')

                self.client.load_table_from_dataframe(df, table_id, job_config=config).result()

        if verbose:
            with self.printer.print_msg(f'Exporting data to table \'{table_id}\''):
                __process(database=database)
        else:
            __process(database=database)

    def execute(self, query_string: str, **kwargs) -> None:
        """
        Sends query to the connected BigQuery warehouse.

        Args:
            query_string (str): Query to execute on the BigQuery warehouse.
            **kwargs: Additional arguments to pass to query, such as query configurations
        """
        with self.printer.print_msg(f'Executing query \'{query_string}\''):
            self.client.query(query_string, **kwargs)

    @classmethod
    def with_config(cls, config: BaseConfigLoader, **kwargs) -> 'BigQuery':
        """
        Initializes BigQuery client from configuration loader

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        if ConfigKey.GOOGLE_SERVICE_ACC_KEY in config:
            kwargs['credentials_mapping'] = config[ConfigKey.GOOGLE_SERVICE_ACC_KEY]
        elif ConfigKey.GOOGLE_SERVICE_ACC_KEY_FILEPATH in config:
            kwargs['path_to_credentials'] = config[ConfigKey.GOOGLE_SERVICE_ACC_KEY_FILEPATH]
        else:
            raise ValueError(
                'No valid configuration settings found for Google BigQuery. You must specify '
                'either your service account key or the filepath to your service account key.'
            )
        return cls(**kwargs)

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
