import warnings
from io import StringIO
from typing import IO, Any, Dict, List, Mapping, Union

from pandas import DataFrame, Series, read_sql

from mage_ai.io.base import QUERY_ROW_LIMIT, BaseSQLConnection, ExportWritePolicy
from mage_ai.io.config import BaseConfigLoader
from mage_ai.io.export_utils import (
    PandasTypes,
    clean_df_for_export,
    gen_table_creation_query,
    infer_dtypes,
)


class BaseSQL(BaseSQLConnection):
    @classmethod
    def with_config(cls, config: BaseConfigLoader):
        """
        Initializes SQL loader from configuration loader

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        raise Exception('Subclasses must override this method.')

    def get_type(self, column: Series, dtype: str) -> str:
        """
        Maps pandas Data Frame column to SQL type

        Args:
            series (Series): Column to map
            dtype (str): Pandas data type of this column

        Raises:
            ConversionError: Returned if this type cannot be converted to a SQL data type

        Returns:
            str: SQL data type for this column
        """
        raise Exception('Subclasses must override this method.')

    def build_create_schema_command(
        self,
        schema_name: str
    ) -> str:
        return f'CREATE SCHEMA IF NOT EXISTS {schema_name};'

    def build_create_table_command(
        self,
        dtypes: Mapping[str, str],
        schema_name: str,
        table_name: str,
        unique_constraints: List[str] = None,
    ) -> str:
        if unique_constraints is None:
            unique_constraints = []
        return gen_table_creation_query(
            dtypes,
            schema_name,
            table_name,
            unique_constraints=unique_constraints,
        )

    def build_create_table_as_command(
        self,
        table_name: str,
        query_string: str,
    ) -> str:
        return 'CREATE TABLE {} AS\n{}'.format(
            table_name,
            query_string,
        )

    def default_database(self) -> str:
        return None

    def default_schema(self) -> str:
        return None

    def open(self) -> None:
        """
        Opens a connection to the SQL database specified by the parameters.
        """
        raise Exception('Subclasses must override this method.')

    def table_exists(self, schema_name: str, table_name: str) -> bool:
        """
        Returns whether the specified table exists.

        Args:
            schema_name (str): Name of the schema the table belongs to.
            table_name (str): Name of the table to check existence of.

        Returns:
            bool: True if the table exists, else False.
        """
        raise Exception('Subclasses must override this method.')

    def upload_dataframe(
        self,
        cursor,
        df: DataFrame,
        db_dtypes: List[str],
        dtypes: List[str],
        full_table_name: str,
        buffer: Union[IO, None] = None,
        **kwargs,
    ) -> None:
        raise Exception('Subclasses must override this method.')

    def execute(self, query_string: str, **query_vars) -> None:
        """
        Sends query to the connected database.

        Args:
            query_string (str): SQL query string to apply on the connected database.
            query_vars: Variable values to fill in when using format strings in query.
        """
        with self.printer.print_msg(f'Executing query \'{query_string}\''):
            query_string = self._clean_query(query_string)
            with self.conn.cursor() as cur:
                cur.execute(query_string, **query_vars)

    def execute_queries(
        self,
        queries: List[str],
        query_variables: List[Dict] = None,
        commit: bool = False,
        fetch_query_at_indexes: List[bool] = None,
    ) -> List:
        results = []

        with self.conn.cursor() as cursor:
            for idx, query in enumerate(queries):
                variables = query_variables[idx] \
                                if query_variables and idx < len(query_variables) \
                                else {}
                query = self._clean_query(query)

                if fetch_query_at_indexes and idx < len(fetch_query_at_indexes) and \
                        fetch_query_at_indexes[idx]:
                    result = self.fetch_query(
                        cursor,
                        query,
                    )
                else:
                    result = cursor.execute(query, **variables)

                results.append(result)

        if commit:
            self.conn.commit()

        return results

    def fetch_query(self, cursor, query: str) -> Any:
        return read_sql(query, self.conn)

    def load(
        self,
        query_string: str,
        limit: int = QUERY_ROW_LIMIT,
        display_query: Union[str, None] = None,
        verbose: bool = True,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from the connected database into a Pandas data frame based on the query given.
        This will fail if the query returns no data from the database. This function will load at
        maximum 10,000,000 rows of data. To operate on more data, consider performing data
        transformations in warehouse.

        Args:
            query_string (str): Query to execute on the database.
            limit (int, Optional): The number of rows to limit the loaded dataframe to. Defaults
                to 10,000,000.
            **kwargs: Additional query parameters.

        Returns:
            DataFrame: The data frame corresponding to the data returned by the given query.
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

        with self.printer.print_msg(print_message):
            warnings.filterwarnings('ignore', category=UserWarning)

            return read_sql(
                self._enforce_limit(query_string, limit),
                self.conn,
                **kwargs,
            )

    def export(
        self,
        df: DataFrame,
        schema_name: str = None,
        table_name: str = None,
        if_exists: ExportWritePolicy = ExportWritePolicy.REPLACE,
        index: bool = False,
        verbose: bool = True,
        query_string: Union[str, None] = None,
        drop_table_on_replace: bool = False,
        cascade_on_drop: bool = False,
        allow_reserved_words: bool = False,
        unique_conflict_method: str = None,
        unique_constraints: List[str] = None,
        **kwargs,
    ) -> None:
        """
        Exports dataframe to the connected database from a Pandas data frame. If table doesn't
        exist, the table is automatically created. If the schema doesn't exist, the schema is
        also created.

        Args:
            schema_name (str): Name of the schema of the table to export data to.
            table_name (str): Name of the table to insert rows from this data frame into.
            if_exists (ExportWritePolicy): Specifies export policy if table exists. Either
                - `'fail'`: throw an error.
                - `'replace'`: drops existing table and creates new table of same name.
                - `'append'`: appends data frame to existing table. In this case the schema must
                                match the original table.
            Defaults to `'replace'`.
            index (bool): If true, the data frame index is also exported alongside the table.
                            Defaults to False.
            **kwargs: Additional query parameters.
        """
        if table_name is None:
            raise Exception('Please provide a table_name argument in the export method.')

        if schema_name is None:
            schema_name = self.default_schema()

        if type(df) is dict:
            df = DataFrame([df])
        elif type(df) is list:
            df = DataFrame(df)

        if schema_name:
            full_table_name = f'{schema_name}.{table_name}'
        else:
            full_table_name = table_name

        if not query_string:
            if index:
                df = df.reset_index()

            # Clean dataframe
            dtypes = infer_dtypes(df)
            df = clean_df_for_export(df, self.clean, dtypes)

            # Clean column names
            col_mapping = {col: self._clean_column_name(
                                        col,
                                        allow_reserved_words=allow_reserved_words)
                           for col in df.columns}
            df = df.rename(columns=col_mapping)
            dtypes = infer_dtypes(df)

        def __process():
            if not query_string and kwargs.get('fast_execute', True) and \
                    hasattr(self, 'upload_dataframe_fast') and callable(self.upload_dataframe_fast):
                self.upload_dataframe_fast(
                    df,
                    schema_name,
                    table_name,
                    if_exists=if_exists,
                )
                return

            buffer = StringIO()
            table_exists = self.table_exists(schema_name, table_name)

            with self.conn.cursor() as cur:
                if schema_name:
                    query = self.build_create_schema_command(schema_name)
                    cur.execute(query)

                should_create_table = not table_exists

                if table_exists:
                    if ExportWritePolicy.FAIL == if_exists:
                        raise ValueError(
                            f'Table \'{full_table_name}\' already exists in database.'
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
                    query = self.build_create_table_as_command(
                        full_table_name,
                        query_string,
                    )

                    if ExportWritePolicy.APPEND == if_exists and table_exists:
                        query = 'INSERT INTO {}\n{}'.format(
                            full_table_name,
                            query_string,
                        )
                    cur.execute(query)
                else:
                    db_dtypes = {col: self.get_type(df[col], dtypes[col]) for col in dtypes}
                    if should_create_table:
                        query = self.build_create_table_command(
                            db_dtypes,
                            schema_name,
                            table_name,
                            unique_constraints=unique_constraints,
                        )
                        cur.execute(query)

                    self.upload_dataframe(
                        cur,
                        df,
                        db_dtypes,
                        dtypes,
                        full_table_name,
                        buffer,
                        allow_reserved_words=allow_reserved_words,
                        unique_conflict_method=unique_conflict_method,
                        unique_constraints=unique_constraints,
                        **kwargs,
                    )
            self.conn.commit()

        if verbose:
            with self.printer.print_msg(
                f'Exporting data to \'{full_table_name}\''
            ):
                __process()
        else:
            __process()

    def clean(self, column: Series, dtype: str) -> Series:
        """
        Cleans column in order to write data frame to PostgreSQL database

        Args:
            column (Series): Column to clean
            dtype (str): The pandas data types of this column

        Returns:
            Series: Cleaned column
        """
        if dtype == PandasTypes.CATEGORICAL:
            return column.astype(str)
        elif dtype in (PandasTypes.TIMEDELTA, PandasTypes.TIMEDELTA64, PandasTypes.PERIOD):
            return column.view(int)
        else:
            return column
