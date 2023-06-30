from mage_ai.io.base import BaseSQLDatabase, ExportWritePolicy, QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import infer_dtypes
from mage_ai.shared.utils import (
    convert_pandas_dtype_to_python_type,
    convert_python_type_to_clickhouse_type,
)
from pandas import DataFrame, Series
from typing import Dict, List, Union
import clickhouse_connect


class ClickHouse(BaseSQLDatabase):
    """
    Handles data transfer between a ClickHouse data warehouse and the Mage app.
    """
    def __init__(self, **kwargs) -> None:
        """
        Initializes settings for connecting to a ClickHouse warehouse.

        To authenticate (and authorize) access to a ClickHouse warehouse,
        credentials, i.e., username and password, must be provided.

        All keyword arguments will be passed to the ClickHouse client.
        """
        if kwargs.get('verbose') is not None:
            kwargs.pop('verbose')
        super().__init__(verbose=kwargs.get('verbose', True))
        with self.printer.print_msg('Connecting to ClickHouse'):
            self.client = clickhouse_connect.get_client(**kwargs)

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'ClickHouse':
        """
        Initializes ClickHouse client from configuration loader

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        if ConfigKey.CLICKHOUSE_HOST not in config:
            raise ValueError(
                'No valid configuration settings found for ClickHouse. '
                'You must specify host.'
            )
        return cls(
            database=config[ConfigKey.CLICKHOUSE_DATABASE],
            host=config[ConfigKey.CLICKHOUSE_HOST],
            interface=config[ConfigKey.CLICKHOUSE_INTERFACE],
            password=config[ConfigKey.CLICKHOUSE_PASSWORD],
            port=config[ConfigKey.CLICKHOUSE_PORT],
            username=config[ConfigKey.CLICKHOUSE_USERNAME],
        )

    def execute(self, command_string: str, **kwargs) -> None:
        """
        Sends command to the connected ClickHouse warehouse.

        Args:
            command_string (str): Command to execute on the ClickHouse warehouse.
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
        Sends query to the connected ClickHouse warehouse.

        Args:
            query (str): Query to execute on the ClickHouse warehouse.
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
        Loads data from ClickHouse into a Pandas data frame based on the query given.
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

    def get_type(self, column: Series, dtype: str) -> str:
        return convert_python_type_to_clickhouse_type(
            convert_pandas_dtype_to_python_type(dtype)
        )

    def build_create_table_command(
        self,
        df: DataFrame,
        table_name: str,
        database: str = 'default',
    ):
        dtypes = infer_dtypes(df)
        db_dtypes = {
            col: self.get_type(df[col], dtypes[col])
            for col in dtypes
        }
        fields = []
        for cname in db_dtypes:
            fields.append(f'{cname} {db_dtypes[cname]}')

        command = f'CREATE TABLE {database}.{table_name} (' + \
            ', '.join(fields) + ') ENGINE = Memory'
        return command

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
        Exports a Pandas data frame to a ClickHouse warehouse based on the table name.
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
                    create_table_stmt = create_table_statement
                    if not create_table_stmt:
                        create_table_stmt = self.build_create_table_command(
                            df=df,
                            table_name=table_name,
                            database=database,
                        )
                        self.printer.print_msg(f'Creating a new table: {create_table_stmt}')
                    self.client.command(create_table_stmt)

                self.client.insert_df(f'{database}.{table_name}', df)

        if verbose:
            with self.printer.print_msg(
                    f'Exporting data to table \'{database}.{table_name}\''):
                __process(database=database)
        else:
            __process(database=database)
