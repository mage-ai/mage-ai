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
        raise Exception('Subclasses must override this method.')

    def get_type(self, column: Series, dtype: str) -> str:
        raise Exception('Subclasses must override this method.')

    def build_create_schema_command(self, schema_name: str) -> str:
        return f'CREATE SCHEMA IF NOT EXISTS {schema_name};'

    def build_create_table_command(
        self,
        dtypes: Mapping[str, str],
        schema_name: str,
        table_name: str,
        auto_clean_name: bool = True,
        case_sensitive: bool = False,
        unique_constraints: List[str] = None,
        overwrite_types: Dict = None,
        skip_semicolon_at_end: bool = False,
        **kwargs,
    ) -> str:
        if unique_constraints is None:
            unique_constraints = []
        return gen_table_creation_query(
            dtypes,
            schema_name,
            table_name,
            auto_clean_name=auto_clean_name,
            case_sensitive=case_sensitive,
            unique_constraints=unique_constraints,
            overwrite_types=overwrite_types,
            skip_semicolon_at_end=skip_semicolon_at_end,
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
        raise Exception('Subclasses must override this method.')

    def table_exists(self, schema_name: str, table_name: str) -> bool:
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
        with self.printer.print_msg(f'Executing query \'{query_string}\''):
            query_string = self._clean_query(query_string)
            with self.conn.cursor() as cur:
                cur.execute(query_string, **query_vars)

    def execute_query_raw(self, query: str, **kwargs) -> None:
        with self.conn.cursor() as cursor:
            result = cursor.execute(query)
        self.conn.commit()
        return result

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
                    result = self.fetch_query(cursor, query)
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
        allow_reserved_words: bool = False,
        auto_clean_name: bool = True,
        case_sensitive: bool = False,
        cascade_on_drop: bool = False,
        drop_table_on_replace: bool = False,
        overwrite_types: Dict = None,
        query_string: Union[str, None] = None,
        unique_conflict_method: str = None,
        unique_constraints: List[str] = None,
        skip_semicolon_at_end: bool = False,
        **kwargs,
    ) -> None:

        if table_name is None:
            raise Exception('Please provide a table_name argument in the export method.')

        if schema_name is None:
            schema_name = self.default_schema()

        if type(df) is dict:
            df = DataFrame([df])
        elif type(df) is list:
            df = DataFrame(df)

        full_table_name = f'{schema_name}.{table_name}' if schema_name else table_name

        if not query_string:
            if index:
                df = df.reset_index()

            dtypes = infer_dtypes(df)
            df = clean_df_for_export(df, self.clean, dtypes)

            if auto_clean_name:
                col_mapping = {
                    col: self._clean_column_name(
                        col,
                        allow_reserved_words=allow_reserved_words,
                        case_sensitive=case_sensitive
                    )
                    for col in df.columns
                }
                df = df.rename(columns=col_mapping)

            dtypes = infer_dtypes(df)

        def __process():
            truncate = kwargs.get('truncate_before_load', False)

            buffer = StringIO()
            table_exists = self.table_exists(schema_name, table_name)

            with self.conn.cursor() as cur:
                if schema_name:
                    cur.execute(self.build_create_schema_command(schema_name))

                should_create_table = not table_exists

                if table_exists:
                    if ExportWritePolicy.FAIL == if_exists:
                        raise ValueError(
                            f"Table '{full_table_name}' already exists in database."
                        )

                    elif ExportWritePolicy.REPLACE == if_exists:
                        if drop_table_on_replace:
                            cmd = f'DROP TABLE {full_table_name}'
                            if cascade_on_drop:
                                cmd += ' CASCADE'
                            cur.execute(cmd)
                            should_create_table = True
                        else:
                            if truncate:
                                print(f"Truncating table {full_table_name}")
                                cur.execute(f'TRUNCATE TABLE {full_table_name}')
                            else:
                                cur.execute(f'DELETE FROM {full_table_name}')

                if query_string:
                    query = self.build_create_table_as_command(
                        full_table_name,
                        query_string,
                    )

                    if ExportWritePolicy.APPEND == if_exists and table_exists:
                        query = f'INSERT INTO {full_table_name}\n{query_string}'

                    cur.execute(query)

                else:
                    db_dtypes = {
                        col: self.get_type(df[col], dtypes[col]) for col in dtypes
                    }

                    if should_create_table:
                        cur.execute(self.build_create_table_command(
                            db_dtypes,
                            schema_name,
                            table_name,
                            auto_clean_name=auto_clean_name,
                            case_sensitive=case_sensitive,
                            unique_constraints=unique_constraints,
                            overwrite_types=overwrite_types,
                            skip_semicolon_at_end=skip_semicolon_at_end,
                        ))

                    self.upload_dataframe(
                        cur,
                        df,
                        db_dtypes,
                        dtypes,
                        full_table_name,
                        allow_reserved_words=allow_reserved_words,
                        buffer=buffer,
                        case_sensitive=case_sensitive,
                        auto_clean_name=auto_clean_name,
                        unique_conflict_method=unique_conflict_method,
                        unique_constraints=unique_constraints,
                        **kwargs,
                    )

            self.conn.commit()

        if verbose:
            with self.printer.print_msg(f"Exporting data to '{full_table_name}'"):
                __process()
        else:
            __process()

    def clean(self, column: Series, dtype: str) -> Series:
        if dtype == PandasTypes.CATEGORICAL:
            return column.astype(str)
        elif dtype in (PandasTypes.TIMEDELTA, PandasTypes.TIMEDELTA64, PandasTypes.PERIOD):
            return column.view(int)
        return column