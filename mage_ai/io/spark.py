from mage_ai.io.base import BaseSQL, ExportWritePolicy, QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import (
    clean_df_for_export,
    infer_dtypes,
)
from pandas import DataFrame
from pyspark.sql import SparkSession
from typing import Dict, List, Union


class Spark(BaseSQL):
    """
    Handles data transfer betwee a Spark session and the Mage app.
    """
    def _get_spark_session(self, **kwargs):
        if self.spark_init:
            return self.spark
        try:
            kwargs.get('verbose')
            self.spark = SparkSession.builder.master(
                kwargs.get('host', 'local')).getOrCreate()
            self.spark_init = True
        except Exception:
            self.spark = None
        return self.spark

    def __init__(self, **kwargs) -> None:
        """
        Initializes settings for connecting to a Spark session.
        """
        if kwargs.get('verbose') is not None:
            kwargs.pop('verbose')
        super().__init__(verbose=kwargs.get('verbose', True))
        self.spark_init = False
        self.spark = None
        with self.printer.print_msg('Connecting to Spark Session'):
            self.client = self._get_spark_session(**kwargs)

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'Spark':
        """
        Initializes Spark Session client from configuration loader

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        if ConfigKey.SPARK_HOST not in config:
            raise ValueError(
                'No valid configuration settings found for Spark Session. '
                'You must specify host.'
            )
        return cls(
            method=config[ConfigKey.SPARK_METHOD],
            host=config[ConfigKey.SPARK_HOST],
            database=config[ConfigKey.SPARK_SCHEMA],
        )

    def execute(self, command_string: str, **kwargs) -> None:
        """
        Sends command to the connected Spark Session.

        Args:
            command_string (str): Command to execute on the Spark Session.
            **kwargs: Additional arguments to pass to command, such as configurations
        """
        with self.printer.print_msg(f'Executing query \'{command_string}\''):
            command_string = self._clean_query(command_string)
            self.client.command(command_string, **kwargs)

    def execute_query(
        self,
        query: str,
        parameters: Dict = None,
        **kwargs,
    ) -> DataFrame:
        """
        Sends query to the connected Spark Session.

        Args:
            query (str): Query to execute on the Spark Session.
            **kwargs: Additional arguments to pass to query, such as query configurations
        """
        query = self._clean_query(query)
        with self.printer.print_msg(f'Executing query \'{query}\''):
            result = self.client.query_df(query, parameters=parameters)

        return result

    def execute_queries(
        self,
        queries: List[str],
        query_variables: List[Dict] = None,
        fetch_query_at_indexes: List[bool] = None,
        **kwargs,
    ) -> List:
        results = []

        for idx, query in enumerate(queries):
            parameters = query_variables[idx] \
                        if query_variables and idx < len(query_variables) \
                        else {}
            query = self._clean_query(query)

            if fetch_query_at_indexes and idx < len(fetch_query_at_indexes) and \
                    fetch_query_at_indexes[idx]:
                result = self.client.query_df(query, parameters=parameters)
            else:
                result = self.client.command(query, parameters=parameters)

            results.append(result)

        return results

    def load(
        self,
        query_string: str,
        limit: int = QUERY_ROW_LIMIT,
        display_query: Union[str, None] = None,
        verbose: bool = True,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from Spark Session into a Pandas data frame based on the query given.
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
            return self.client.query_df(
                self._enforce_limit(query_string, limit), **kwargs
            )

    def export(
        self,
        df: DataFrame,
        table_name: str,
        database: str = 'default',
        if_exists: str = 'append',
        index: bool = False,
        query_string: Union[str, None] = None,
        create_table_statement: Union[str, None] = None,
        verbose: bool = True,
        **kwargs,
    ) -> None:
        """
        Exports a Pandas data frame to a Spark Session based on the table name.
        If table doesn't exist, the table is automatically created.

        Args:
            df (DataFrame): Data frame to export
            table_name (str): Name of the table to export data to (excluding database).
            If this table exists, the table schema must match the data frame schema.
            If this table doesn't exist, query_string must be specified to create the new table.
            database (str): Name of the database in which the table is located.
            if_exists (str, optional): Specifies export policy if table exists. Either
                - `'fail'`: throw an error.
                - `'replace'`: drops existing table and creates new table of same name.
                - `'append'`: appends data frame to existing table. In this case the schema must
                                match the original table.
            Defaults to `'append'`.
            **kwargs: Additional arguments to pass to writer
        """

        if type(df) is dict:
            df = DataFrame([df])
        elif type(df) is list:
            df = DataFrame(df)

        if not query_string:
            if index:
                df = df.reset_index()

            dtypes = infer_dtypes(df)
            df = clean_df_for_export(df, self.clean, dtypes)

        def __process(database: Union[str, None]):

            df_existing = self.client.query_df(f"""
EXISTS TABLE {database}.{table_name}
""")

            table_exists = not df_existing.empty and df_existing.iloc[0, 0] == 1
            should_create_table = not table_exists

            if table_exists:
                if ExportWritePolicy.FAIL == if_exists:
                    raise ValueError(
                        f'Table \'{table_name}\' already'
                        ' exists in database {database}.',
                    )
                elif ExportWritePolicy.REPLACE == if_exists:
                    self.client.command(
                        f'DROP TABLE IF EXISTS {database}.{table_name}')
                    should_create_table = True

            if query_string:
                self.client.command(f'USE {database}')

                if should_create_table:
                    self.client.command(f"""
CREATE TABLE IF NOT EXISTS {database}.{table_name} ENGINE = Memory AS
{query_string}
""")
                else:
                    self.client.command(f"""
INSERT INTO {database}.{table_name}
{query_string}
""")
            else:
                if should_create_table:
                    self.client.command(create_table_statement)

                self.client.insert_df(f'{database}.{table_name}', df)

        if verbose:
            with self.printer.print_msg(
                    f'Exporting data to table \'{database}.{table_name}\''):
                __process(database=database)
        else:
            __process(database=database)
