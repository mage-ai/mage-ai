import uuid
from typing import Dict, List, Mapping, Union

import numpy as np
from google.cloud.bigquery import (
    Client,
    LoadJobConfig,
    QueryJob,
    SchemaField,
    WriteDisposition,
)
from google.oauth2 import service_account
from pandas import DataFrame
from sqlglot import exp, parse_one

from mage_ai.io.base import QUERY_ROW_LIMIT, BaseSQLDatabase, ExportWritePolicy
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.constants import UNIQUE_CONFLICT_METHOD_UPDATE
from mage_ai.io.export_utils import infer_dtypes
from mage_ai.shared.custom_logger import DX_PRINTER
from mage_ai.shared.environments import is_debug
from mage_ai.shared.utils import (
    convert_pandas_dtype_to_python_type,
    convert_python_type_to_bigquery_type,
)


class BigQuery(BaseSQLDatabase):
    """
    Handles data transfer between a BigQuery data warehouse and the Mage app.
    """

    def __init__(self, **kwargs) -> None:
        """
        Initializes settings for connecting to a BigQuery warehouse.

        To authenticate (and authorize) access to a BigQuery warehouse, credentials must be
        provided.
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

        All keyword arguments except for `path_to_credentials` and `credentials_mapping` will be
        passed to the Google BigQuery client, accepting all other configuration settings there.
        """
        if kwargs.get('verbose') is not None:
            kwargs.pop('verbose')
        super().__init__(verbose=kwargs.get('verbose', True))

        CLIENT_SCOPES = [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/bigquery',
        ]

        credentials = kwargs.get('credentials')
        if credentials is None:
            if 'credentials_mapping' in kwargs:
                mapping_obj = kwargs.pop('credentials_mapping')
                if mapping_obj is not None:
                    credentials = service_account.Credentials.from_service_account_info(
                        mapping_obj, scopes=CLIENT_SCOPES
                            )
            if 'path_to_credentials' in kwargs:
                path = kwargs.pop('path_to_credentials')
                if path is not None:
                    credentials = service_account.Credentials.from_service_account_file(
                        path, scopes=CLIENT_SCOPES
                            )
            if 'credentials' in kwargs:
                kwargs.pop('credentials')
        with self.printer.print_msg('Connecting to BigQuery warehouse'):
            self.client = Client(credentials=credentials, **kwargs)

    def default_database(self) -> str:
        return self.client.project

    def get_column_types(self, schema: str, table_name: str) -> Dict:
        results = self.client.query(f"""
SELECT
    column_name
    , data_type
FROM {schema}.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '{table_name}'
""")

        column_types = {}
        for col, col_type in results:
            column_types[col.lower()] = col_type

        return column_types

    def alter_table(
        self,
        df: DataFrame,
        table_id: str,
        database: Union[str, None] = None,
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

            current_columns = list(self.get_column_types(schema, table_name).keys())

            columns = []
            if type(df) is DataFrame:
                columns = df.columns
            elif type(df) is dict:
                columns = df.keys()

            new_columns = [c for c in columns if c.lower() not in current_columns]
            if not new_columns:
                return
            dtypes = infer_dtypes(df)
            dtypes = \
                {k: convert_python_type_to_bigquery_type(convert_pandas_dtype_to_python_type(v))
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
        display_query: Union[str, None] = None,
        verbose: bool = True,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from BigQuery into a Pandas data frame based on the query given.
        This will fail if the query returns no data from the database. When a select query
        is provided, this function will load at maximum 10,000,000 rows of data. To operate on more
        data, consider performing data transformations in warehouse.

        Args:
            query_string (str): Query to fetch a table or subset of a table.
            limit (int, Optional): The number of rows to limit the loaded dataframe to. Defaults to
                                    10,000,000.
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
        table_id: str = None,
        database: Union[str, None] = None,
        if_exists: str = 'replace',
        overwrite_types: Dict = None,
        query_string: Union[str, None] = None,
        verbose: bool = True,
        unique_conflict_method: str = None,
        unique_constraints: List[str] = None,
        write_disposition: str = None,
        create_dataset: bool = True,
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
                - `'append'`: appends data frame to existing table. In this case the schema must
                                match the original table.
                Defaults to `'replace'`. If `write_disposition` is specified as a keyword argument,
                this parameter is ignored (as both define the same functionality).
            overwrite_types (Dict): The column types to be overwritten by users.
            create_dataset (bool): If set to True, creates the dataset
            **configuration_params: Configuration parameters for export job
        """
        if table_id is None:
            raise Exception('Please provide a table_id argument in the export method.')

        if type(df) is dict:
            df = DataFrame([df])
        elif type(df) is list:
            df = DataFrame(df)

        def __process(database: Union[str, None], write_disposition: str = None):
            parts = table_id.split('.')
            if len(parts) == 2:
                schema, table_name = parts
            elif len(parts) == 3:
                database, schema, table_name = parts

            database = database or self.default_database()
            df_existing = self.client.query(f"""
SELECT 1
FROM `{database}.{schema}.__TABLES_SUMMARY__`
WHERE table_id = '{table_name}'
""").to_dataframe()

            full_table_name = f'`{database}.{schema}.{table_name}`'

            table_doesnt_exist = df_existing.empty
            if query_string:
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
                if (
                    if_exists == ExportWritePolicy.APPEND
                    and not table_doesnt_exist
                    and unique_constraints
                    and unique_conflict_method
                ):
                    temp_table_id = f'{table_id}_{uuid.uuid4().hex}'

                    try:
                        self.__write_table(
                            df,
                            temp_table_id,
                            overwrite_types=overwrite_types,
                            create_dataset=create_dataset,
                            **configuration_params,
                        )

                        parts = temp_table_id.split('.')
                        if len(parts) == 2:
                            temp_table_name = parts[1]
                        elif len(parts) == 3:
                            temp_table_name = parts[2]
                        column_types = self.get_column_types(schema, temp_table_name)
                        columns = list(column_types.keys())
                        if not columns:
                            columns = df.columns.str.replace(' ', '_')

                        on_conditions = []
                        for col in unique_constraints:
                            on_conditions.append(
                                f'((a.{col} IS NULL AND b.{col} IS NULL) OR a.{col} = b.{col})',
                            )

                        insert_columns = ', '.join([f'`{col}`' for col in columns])

                        merge_commands = [
                            f'MERGE INTO `{table_id}` AS a',
                            f'USING (SELECT * FROM `{temp_table_id}`) AS b',
                            f"ON {' AND '.join(on_conditions)}",
                        ]

                        if UNIQUE_CONFLICT_METHOD_UPDATE == unique_conflict_method:
                            set_command = ', '.join(
                                [f'a.`{col}` = b.`{col}`' for col in columns],
                            )
                            merge_commands.append(f'WHEN MATCHED THEN UPDATE SET {set_command}')

                        merge_values = f"({', '.join([f'b.`{col}`' for col in columns])})"
                        merge_commands.append(
                            f'WHEN NOT MATCHED THEN INSERT ({insert_columns}) VALUES {merge_values}',  # noqa: E501
                        )

                        merge_command = '\n'.join(merge_commands)

                        self.client.query(merge_command).result()
                    finally:
                        self.client.query(f'DROP TABLE IF EXISTS {temp_table_id}').result()
                else:
                    if not write_disposition:
                        if if_exists == ExportWritePolicy.APPEND:
                            write_disposition = WriteDisposition.WRITE_APPEND
                        elif if_exists == ExportWritePolicy.REPLACE:
                            write_disposition = WriteDisposition.WRITE_TRUNCATE
                        elif if_exists == ExportWritePolicy.FAIL:
                            write_disposition = WriteDisposition.WRITE_EMPTY
                    self.__write_table(
                        df,
                        table_id,
                        overwrite_types=overwrite_types,
                        write_disposition=write_disposition,
                        create_dataset=create_dataset,
                        **configuration_params,
                    )

        if verbose:
            with self.printer.print_msg(f'Exporting data to table \'{table_id}\''):
                __process(database=database, write_disposition=write_disposition)
        else:
            __process(database=database)

    def __write_table(
        self,
        df: DataFrame,
        table_id: str,
        overwrite_types: Dict = None,
        create_dataset: bool = True,
        **configuration_params,
    ):
        config = LoadJobConfig(**configuration_params)
        if overwrite_types is not None:
            config.schema = [SchemaField(k, v) for k, v in overwrite_types.items()]
        if not config.write_disposition:
            config.write_disposition = WriteDisposition.WRITE_APPEND
        parts = table_id.split('.')
        if len(parts) == 2:
            schema = parts[0]
            table_name = parts[1]
        elif len(parts) == 3:
            schema = parts[1]
            table_name = parts[2]

        if schema and create_dataset:
            self.client.create_dataset(dataset=schema, exists_ok=True)

        column_types = self.get_column_types(schema, table_name)

        if df is not None:
            df.fillna(value=np.NaN, inplace=True)
            for col in df.columns:
                col_type = column_types.get(col)
                if not col_type:
                    continue

                null_rows = df[col].isnull()
                if col_type.startswith('ARRAY<STRUCT'):
                    df.loc[null_rows, col] = df.loc[null_rows, col].apply(lambda x: [{}])
                elif col_type.startswith('ARRAY'):
                    df.loc[null_rows, col] = df.loc[null_rows, col].apply(lambda x: [])
                elif col_type.startswith('STRUCT'):
                    df.loc[null_rows, col] = df.loc[null_rows, col].apply(lambda x: {})

            # Clean column names
            if type(df) is DataFrame:
                df.columns = df.columns.str.replace(' ', '_')

            return self.client.load_table_from_dataframe(df, table_id, job_config=config).result()

    def execute(self, query_string: str, **kwargs) -> None:
        """
        Sends query to the connected BigQuery warehouse.

        Args:
            query_string (str): Query to execute on the BigQuery warehouse.
            **kwargs: Additional arguments to pass to query, such as query configurations
        """
        with self.printer.print_msg(f'Executing query \'{query_string}\''):
            query_string = self._clean_query(query_string)
            self.client.query(query_string, **kwargs)

    def execute_query_raw(self, query: str, configuration: Dict = None, **kwargs) -> None:
        DX_PRINTER.print(
            f'BigQuery.execute_query_raw\n{query}',
        )
        job = self.client.query(query)
        return job.result()

    def execute_queries(
        self,
        queries: List[str],
        query_variables: List[Dict] = None,
        fetch_query_at_indexes: List[bool] = None,
        **kwargs,
    ) -> List:
        results = []

        for idx, query in enumerate(queries):
            variables = query_variables[idx] \
                        if query_variables and idx < len(query_variables) \
                        else {}
            query = self._clean_query(query)

            if is_debug():
                print(f'\nExecuting query:\n\n{query}\n')

            result = self.client.query(query, **variables)

            if fetch_query_at_indexes and idx < len(fetch_query_at_indexes) and \
                    fetch_query_at_indexes[idx]:
                result = result.to_dataframe()

            results.append(result)

        serialized = []

        for result in results:
            try:
                if isinstance(result, QueryJob):
                    serialized.append(result.to_dataframe())
                else:
                    serialized.append(result)
            except Exception:
                pass

        return serialized

    def _clean_query(self, query_string: str) -> str:
        query_string = super()._clean_query(query_string)

        # This breaks io/bigquery.py:
        # BadRequest: 400 Syntax error:
        # Expected keyword ALL or keyword DISTINCT but got keyword SELECT at [3:140]
        # try:
        #     query_string_updated = self.__fix_table_names(query_string)
        #     query_string = query_string_updated
        # except Exception as err:
        #     print(f'[ERROR] Attempted to complete table names: {err}, will continue...')

        return query_string

    def __fix_table_names(self, query_string: str) -> str:
        # Add best guess database and data set names to each table so that it doesn’t return 404.
        mapping = {}

        for table in parse_one(query_string, read='bigquery').find_all(exp.Table):
            if table.catalog not in mapping:
                mapping[table.catalog] = {}
            if table.db not in mapping[table.catalog]:
                mapping[table.catalog][table.db] = []
            mapping[table.catalog][table.db].append(table.name)

        database = sorted(
            [(len(mapping[db]), db) for db in mapping.keys() if db],
            reverse=True,
        )[0][1]

        if not database:
            raise Exception('At least 1 of the tables must contain: database.dataset.table')

        mapping2 = mapping[database]
        dataset = sorted(
            [(len(mapping2[ds]), ds) for ds in mapping2.keys() if ds],
            reverse=True,
        )[0][1]

        if not dataset:
            raise Exception('At least 1 of the tables must contain: database.dataset.table')

        if is_debug():
            print(f'Database with the most frequency: {database}')
            print(f'Dataset with the most frequency : {dataset}')

        expression_tree = parse_one(query_string, read='bigquery')

        def transformer(node):
            if isinstance(node, exp.Table):
                parts = [
                    node.catalog if node.catalog else database,
                    node.db if node.db and node.db != database else dataset,
                    node.name
                ]

                full_table_name = '.'.join(parts)

                if is_debug():
                    if not node.catalog or not node.db or node.db == database:
                        print(f'Malformed full table name: {node.catalog}.{node.db}.{node.name}')
                        print(f'Adjusting full table name: {full_table_name}')

                node.set('catalog', parts[0])
                node.set('db', parts[1])
                node.set('name', parts[2])

                return node

            return node

        transformed_tree = expression_tree.transform(transformer)

        return transformed_tree.sql()

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

        if ConfigKey.GOOGLE_LOCATION in config:
            kwargs['location'] = config[ConfigKey.GOOGLE_LOCATION]

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
            credentials (Mapping[str, str]): Credentials object. Must contain all the OAuth
                information necessary to authenticate and authorize BigQuery access. This should
                resemble a service account key.

        Returns:
            BigQuery: BigQuery data loader
        """
        return cls(credentials_mapping=credentials, **kwargs)
