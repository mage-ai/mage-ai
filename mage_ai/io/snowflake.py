from mage_ai.io.base import BaseSQLConnection, ExportWritePolicy, QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from pandas import DataFrame
from snowflake.connector import connect
from snowflake.connector.pandas_tools import write_pandas
from typing import Dict, List, Union
import pandas as pd


DEFAULT_LOGIN_TIMEOUT = 20
# NOTE: if credentials are wrong, it’ll take this many seconds for the user to be shown an error.
# TODO: check credentials before executing query and error sooner
# than waiting for Snowflake to timeout.
DEFAULT_NETWORK_TIMEOUT = 60 * 5


class Snowflake(BaseSQLConnection):
    """
    Handles data transfer between a Snowflake data warehouse and the Mage app.
    """

    def __init__(self, **kwargs) -> None:
        """
        Initializes settings for connecting to Snowflake data warehouse.
        The following arguments must be provided to the connector, all other
        arguments are optional.

        Required Arguments:
            user (str): Username for the Snowflake user.
            password (str): Login Password for the user.
            account (str): Snowflake account identifier (excluding
            `snowflake-computing.com` suffix).
        """
        if 'login_timeout' not in kwargs:
            kwargs['login_timeout'] = DEFAULT_LOGIN_TIMEOUT
        if 'network_timeout' not in kwargs:
            kwargs['network_timeout'] = DEFAULT_NETWORK_TIMEOUT
        if kwargs.get('verbose') is not None:
            kwargs.pop('verbose')
        super().__init__(verbose=kwargs.get('verbose', True), **kwargs)

    def open(self) -> None:
        """
        Opens a connection to Snowflake.
        """
        with self.printer.print_msg('Connecting to Snowflake warehouse'):
            self._ctx = connect(**self.settings)

    def execute(self, query_string: str, **kwargs) -> None:
        """
        Executes any query in the Snowflake data warehouse.

        Args:
            query_string (str): The query to execute on Snowflake's platform.
            **kwargs: Additional parameters to provide to the query
        """
        with self.printer.print_msg(f'Executing query \'{query_string}\''):
            query_string = self._clean_query(query_string)
            with self.conn.cursor() as cur:
                return cur.execute(query_string, **kwargs).fetchall()

    def execute_queries(
        self,
        queries: List[str],
        query_variables: List[Dict] = None,
        fetch_query_at_indexes: List[bool] = None,
        **kwargs,
    ):
        results = []

        with self.conn.cursor() as cursor:
            for idx, query in enumerate(queries):
                variables = query_variables[idx] \
                                if query_variables and idx < len(query_variables) \
                                else {}
                query = self._clean_query(query)

                if fetch_query_at_indexes and idx < len(fetch_query_at_indexes) and \
                        fetch_query_at_indexes[idx]:

                    full_table_name = fetch_query_at_indexes[idx]
                    columns = self.get_columns(
                        cursor,
                        full_table_name=full_table_name,
                    )
                    rows = cursor.execute(query, **variables).fetchall()
                    result = pd.DataFrame(rows, columns=columns)
                else:
                    result = cursor.execute(query, **variables)

                results.append(result)

        return results

    def get_columns(
        self,
        cursor,
        database: str = None,
        schema: str = None,
        table_name: str = None,
        full_table_name: str = None,
    ) -> List[str]:
        columns = None
        if not full_table_name and database and schema and table_name:
            full_table_name = f'"{database}"."{schema}"."{table_name}"'

        if full_table_name:
            arr = cursor.execute(f'DESCRIBE TABLE {full_table_name}').fetchall()
            columns = [t[0] for t in arr]

        return columns

    def load(
        self,
        query_string: str,
        limit: int = QUERY_ROW_LIMIT,
        display_query: Union[str, None] = None,
        verbose: bool = True,
        database: str = None,
        schema: str = None,
        table_name: str = None,
        full_table_name: str = None,
        *args,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from Snowflake into a Pandas data frame based on the query given.
        This will fail unless a `SELECT` query is provided. This function will load at
        maximum 10,000,000 rows of data. To operate on more data, consider performing data
        transformations in warehouse.

        Args:
            query_string (str): Query to fetch a table or subset of a table.
            limit (int, Optional): The number of rows to limit the loaded dataframe to. Defaults
                                    to 10,000,000.
            *args, **kwargs: Additional parameters to provide to the query

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
            with self.conn.cursor() as cur:
                columns = None
                if (database and schema and table_name) or full_table_name:
                    columns = self.get_columns(
                        cur,
                        database=database,
                        schema=schema,
                        table_name=table_name,
                        full_table_name=full_table_name,
                    )

                results = cur.execute(
                    self._enforce_limit(query_string, limit), *args, **kwargs
                ).fetchall()

                if not columns and len(results) >= 1:
                    columns = [f'col{i}' for i in range(len(results[0]))]

                return pd.DataFrame(results, columns=columns)

    def export(
        self,
        df: DataFrame,
        table_name: str,
        database: str,
        schema: str,
        if_exists: str = 'append',
        query_string: Union[str, None] = None,
        verbose: bool = True,
        **kwargs,
    ) -> None:
        """
        Exports a Pandas data frame to a Snowflake warehouse based on the table name.
        If table doesn't exist, the table is automatically created.

        Args:
            df (DataFrame): Data frame to export to a Snowflake warehouse.
            table_name (str): Name of the table to export data to (excluding database and schema).
            database (str): Name of the database in which the table is located.
            schema (str): Name of the schema in which the table is located.
            if_exists (str, optional): Specifies export policy if table exists. Either
                - `'fail'`: throw an error.
                - `'replace'`: drops existing table and creates new table of same name.
                - `'append'`: appends data frame to existing table.
            Defaults to `'append'`.
            **kwargs: Additional arguments to pass to writer
        """

        if type(df) is dict:
            df = pd.DataFrame([df])
        elif type(df) is list:
            df = pd.DataFrame(df)

        def __process():
            with self._ctx.cursor() as cur:
                cur.execute(f'CREATE SCHEMA IF NOT EXISTS {database}.{schema}')

                cur.execute(f'USE DATABASE {database}')
                cur.execute(f'SELECT * FROM information_schema.tables WHERE table_schema = '
                            f'\'{schema}\' AND table_name = \'{table_name}\'')

                table_exists = cur.rowcount >= 1
                should_create_table = not table_exists

                if table_exists:
                    if cur.rowcount > 1:
                        raise ValueError(
                            f'Two or more tables with the name {table_name} are found.',
                        )

                    if ExportWritePolicy.FAIL == if_exists:
                        raise RuntimeError(
                            f'Table {table_name} already exists in the current warehouse, '
                            'database, schema scenario.'
                        )
                    elif ExportWritePolicy.REPLACE == if_exists:
                        cur.execute(f'USE DATABASE {database}')
                        cur.execute(f'DROP TABLE "{schema}"."{table_name}"')
                        should_create_table = True

                if query_string:
                    cur.execute(f'USE DATABASE {database}')

                    if should_create_table:
                        cur.execute(f"""
CREATE TABLE IF NOT EXISTS "{database}"."{schema}"."{table_name}" AS
{query_string}
""")
                    else:
                        cur.execute(f"""
INSERT INTO "{database}"."{schema}"."{table_name}"
{query_string}
""")

                else:
                    write_pandas(
                        self.conn,
                        df,
                        table_name,
                        database=database,
                        schema=schema,
                        auto_create_table=should_create_table,
                        **kwargs,
                    )

        if verbose:
            with self.printer.print_msg(
                f'Exporting data to \'{database}.{schema}.{table_name}\''
            ):
                __process()
        else:
            __process()

    @classmethod
    def with_config(
        cls,
        config: BaseConfigLoader,
        database=None,
        schema=None,
        **kwargs,
    ) -> 'Snowflake':
        """
        Initializes Snowflake client from configuration loader.

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        return cls(
            user=config[ConfigKey.SNOWFLAKE_USER],
            password=config[ConfigKey.SNOWFLAKE_PASSWORD],
            account=config[ConfigKey.SNOWFLAKE_ACCOUNT],
            warehouse=config[ConfigKey.SNOWFLAKE_DEFAULT_WH],
            database=database or config[ConfigKey.SNOWFLAKE_DEFAULT_DB],
            schema=schema or config[ConfigKey.SNOWFLAKE_DEFAULT_SCHEMA],
            **kwargs,
        )
