from mage_ai.io.base import ExportWritePolicy, QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import (
    clean_df_for_export,
    infer_dtypes,
)
from mage_ai.io.sql import BaseSQL
from mage_ai.io.utils import format_value
from mage_ai.shared.utils import (
    convert_pandas_dtype_to_python_type,
    convert_python_type_to_redshift_type,
)
from pandas import DataFrame
from redshift_connector import connect
from typing import Union
import json
import pandas as pd


class Redshift(BaseSQL):
    """
    Handles data transfer between a Redshift cluster and the Mage app.
    """

    def __init__(self, **kwargs) -> None:
        """
        Initializes settings for connecting to a cluster.
        """
        if kwargs.get('verbose') is not None:
            kwargs.pop('verbose')
        super().__init__(verbose=kwargs.get('verbose', True), **kwargs)

    def open(self) -> None:
        """
        Opens a connection to the Redshift cluster.
        """
        with self.printer.print_msg('Connecting to Redshift cluster'):
            self._ctx = connect(**self.settings)

    def execute(self, query_string: str, **kwargs) -> None:
        """
        Sends query to the connected Redshift cluster.

        Args:
            query_string (str): The query to execute on the Redshift cluster.
            **kwargs: Additional parameters to pass to the query.
        """
        with self.printer.print_msg(f'Executing query \'{query_string}\''):
            query_string = self._clean_query(query_string)
            with self.conn.cursor() as cur:
                cur.execute(query_string, **kwargs)

    def load(
        self,
        query_string: str,
        limit: int = QUERY_ROW_LIMIT,
        display_query: Union[str, None] = None,
        verbose: bool = True,
        *args,
        **kwargs,
    ) -> Union[DataFrame, None]:
        """
        Uses query to load data from Redshift cluster into a Pandas data frame.
        This will fail if the query returns no data from the database. When a
        select query is provided, this function will load at maximum 10,000,000 rows of data.
        To operate on more data, consider performing data transformations in warehouse.


        Args:
            query_string (str): Query to fetch a table or subset of a table.
            limit (int, Optional): The number of rows to limit the loaded dataframe to.
                                    Defaults to 10,000,000.
            *args, **kwargs: Additional parameters to send to query, including parameters
            for use with format strings. See `redshift-connector` docs for more options.

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
                print_message += f'\n\n{query_string}\n\n'

        query_string = self._clean_query(query_string)

        try:
            with self.printer.print_msg(print_message):
                with self.conn.cursor() as cur:
                    return cur.execute(
                        self._enforce_limit(query_string, limit), *args, **kwargs
                    ).fetch_dataframe()
        except Exception as e:
            try:
                raw_string = str(e).replace('"', '\\"').replace("'", '"')
                error_message = json.loads(raw_string).get('M')
                if error_message:
                    print(f'\n\nError: {error_message}')
                else:
                    raise e
            except json.JSONDecodeError:
                raise e

    def export(
        self,
        df: DataFrame,
        table_name: str,
        schema: Union[str, None] = None,
        schema_name: Union[str, None] = None,
        if_exists: ExportWritePolicy = ExportWritePolicy.APPEND,
        index: bool = False,
        verbose: bool = True,
        query_string: Union[str, None] = None,
        drop_table_on_replace: bool = False,
        cascade_on_drop: bool = False,
        create_schema: bool = False,
    ) -> None:
        """
        Exports a Pandas data frame to a Redshift cluster given table name.

        Args:
            df (DataFrame): Data frame to export to a Redshift cluster.
            table_name (str): Name of the table to export the data to.
            Table must already exist.
        """
        # TODO: Add support for creating new tables if table doesn't exist

        # CREATE TABLE predictions_dev.test_v01 AS
        # SELECT *
        # FROM experimentation.assignments_dev

        if type(df) is dict:
            df = pd.DataFrame([df])
        elif type(df) is list:
            df = pd.DataFrame(df)

        if schema and not schema_name:
            schema_name = schema

        if schema_name:
            full_table_name = f'{schema_name}.{table_name}'
        else:
            parts = table_name.split('.')
            if len(parts) == 2:
                schema_name = parts[0]
                table_name = parts[1]
                full_table_name = f'{schema_name}.{table_name}'
            else:
                schema_name = 'public'
                full_table_name = table_name

        if not query_string:
            if index:
                df = df.reset_index()

            dtypes = infer_dtypes(df)
            df = clean_df_for_export(df, self.clean, dtypes)

        def __process():
            table_exists = self.table_exists(schema_name, table_name)

            columns_with_type = []
            if not query_string:
                columns = []
                if type(df) is DataFrame:
                    columns = df.columns
                elif type(df) is dict:
                    columns = df.keys()

                columns_with_type = [(
                    col,
                    convert_python_type_to_redshift_type(
                        convert_pandas_dtype_to_python_type(df.dtypes[col]),
                    ),
                ) for col in columns]

            with self.conn.cursor() as cur:
                if schema_name and create_schema:
                    cur.execute(f'CREATE SCHEMA IF NOT EXISTS {schema_name};')

                should_create_table = not table_exists

                if table_exists:
                    if ExportWritePolicy.FAIL == if_exists:
                        raise ValueError(
                            f'Table \'{full_table_name}\' already exists in database.',
                        )
                    elif ExportWritePolicy.REPLACE == if_exists:
                        if drop_table_on_replace:
                            cmd = f'DROP TABLE {full_table_name}'
                            if cascade_on_drop:
                                cmd = f'{cmd} CASCADE'
                            cur.execute(cmd)
                            should_create_table = True
                        else:
                            cur.execute(f'DELETE FROM {full_table_name}')

                if query_string:
                    query = f'CREATE TABLE {full_table_name} AS\n{query_string}'

                    if ExportWritePolicy.APPEND == if_exists and table_exists:
                        query = f'INSERT INTO {full_table_name}\n{query_string}'

                    cur.execute(query)
                else:
                    if should_create_table:
                        col_with_types = ', '.join(
                            [f'{col} {col_type}' for col, col_type in columns_with_type],
                        )
                        query = f'CREATE TABLE IF NOT EXISTS {full_table_name} ({col_with_types})'
                        cur.execute(query)

                    columns = ', '.join([t[0] for t in columns_with_type])
                    values = [f"""({', '.join([format_value(x) for x in v])})""" for v in df.values]
                    values = ', '.join(values)
                    query = f'INSERT INTO {full_table_name} ({columns})\nVALUES {values}'
                    cur.execute(query)

                self.conn.commit()

        try:
            if verbose:
                with self.printer.print_msg(f'Exporting data to table \'{full_table_name}\''):
                    __process()
            else:
                __process()
        except Exception as e:
            try:
                raw_string = str(e).replace('"', '\\"').replace("'", '"')
                error_message = json.loads(raw_string).get('M')
                if error_message:
                    print(f'\n\nError: {error_message}')
                raise e
            except json.JSONDecodeError:
                raise e

    @classmethod
    def with_config(
        cls,
        config: BaseConfigLoader,
        database=None,
        **kwargs,
    ) -> 'Redshift':
        """
        Initializes Redshift client from configuration loader.

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        if ConfigKey.REDSHIFT_DBNAME not in config:
            raise ValueError('AWS Redshift client requires REDSHIFT_DBNAME setting to connect.')
        kwargs['database'] = database or config[ConfigKey.REDSHIFT_DBNAME]
        if (
            ConfigKey.REDSHIFT_CLUSTER_ID in config
            and ConfigKey.REDSHIFT_DBUSER in config
            and ConfigKey.REDSHIFT_IAM_PROFILE in config
        ):
            kwargs['cluster_identifier'] = config[ConfigKey.REDSHIFT_CLUSTER_ID]
            kwargs['db_user'] = config[ConfigKey.REDSHIFT_DBUSER]
            kwargs['profile'] = config[ConfigKey.REDSHIFT_IAM_PROFILE]
            kwargs['iam'] = True
        elif (
            ConfigKey.REDSHIFT_TEMP_CRED_USER in config
            and ConfigKey.REDSHIFT_TEMP_CRED_PASSWORD in config
            and ConfigKey.REDSHIFT_HOST in config
        ):
            kwargs['user'] = config[ConfigKey.REDSHIFT_TEMP_CRED_USER]
            kwargs['password'] = config[ConfigKey.REDSHIFT_TEMP_CRED_PASSWORD]
            kwargs['host'] = config[ConfigKey.REDSHIFT_HOST]
            kwargs['port'] = config[ConfigKey.REDSHIFT_PORT]
        else:
            raise ValueError(
                'No valid configuration found for initializing AWS Redshift client. '
                'Either specify your temporary database '
                'credentials or provide your IAM Profile and Redshift cluster information to '
                'automatically generate temporary database credentials.'
            )
        kwargs['access_key_id'] = config[ConfigKey.AWS_ACCESS_KEY_ID]
        kwargs['secret_access_key'] = config[ConfigKey.AWS_SECRET_ACCESS_KEY]
        kwargs['region'] = config[ConfigKey.AWS_REGION]
        return cls(**kwargs)

    @classmethod
    def with_temporary_credentials(
        cls, database: str, host: str, user: str, password: str, port: int = 5439, **kwargs
    ) -> 'Redshift':
        """
        Creates a Redshift data loader from temporary database credentials

        Args:
            database (str): Name of the database to connect to
            host (str): The hostname of the Redshift cluster which the database belongs to
            user (str): Username for authentication
            password (str): Password for authentication
            port (int, optional): Port number of the Redshift cluster. Defaults to 5439.
            **kwargs: Additional parameters passed to the loader constructor

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
        **kwargs,
    ) -> 'Redshift':
        """
        Creates a Redshift data loader using an IAM profile from `~/.aws`.

        The IAM Profile configuration can also be manually specified as keyword
        arguments to this constructor, but is not recommended. If credentials are manually
        specified, the region of the Redshift cluster must also be specified.

        Args:
            cluster_identifier (str): Identifier of the cluster to connect to.
            database (str): The database to connect to within the specified cluster.
            db_user (str): Database username
            profile (str, optional): The profile to use from stored credentials file.
            Defaults to 'default'.
            **kwargs: Additional parameters passed to the loader constructor

        Returns:
            Redshift: the constructed dataloader using this method
        """
        return cls(
            cluster_identifier=cluster_identifier,
            database=database,
            profile=profile,
            db_user=db_user,
            iam=True,
            **kwargs,
        )

    def table_exists(self, schema_name: str, table_name: str) -> bool:
        with self.conn.cursor() as cur:
            cur.execute(f'SET search_path TO {schema_name}')
            cur.execute(f"""
SELECT 1
FROM information_schema.tables
WHERE table_schema = '{schema_name}'
AND table_name = '{table_name}'
""")
            return len(cur.fetchall()) >= 1
