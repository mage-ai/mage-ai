from typing import Dict, List, Tuple

import pandas as pd
import simplejson
from snowflake.connector.pandas_tools import write_pandas

from mage_integrations.connections.snowflake import Snowflake as SnowflakeConnection
from mage_integrations.destinations.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.destinations.snowflake.utils import (
    build_alter_table_command,
    convert_array,
    convert_column_if_json,
    convert_column_type,
)
from mage_integrations.destinations.sql.base import Destination, main
from mage_integrations.destinations.sql.utils import (
    build_create_table_command,
    build_insert_command,
    column_type_mapping,
)
from mage_integrations.utils.array import batch
from mage_integrations.utils.parsers import encode_complex


class Snowflake(Destination):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.use_batch_load = self.config.get('use_batch_load', False)

    @property
    def quote(self) -> str:
        if self.disable_double_quotes:
            return ''
        return '"'

    @property
    def disable_double_quotes(self) -> bool:
        return self.config.get('disable_double_quotes', False)

    def build_connection(self) -> SnowflakeConnection:
        return SnowflakeConnection(
            account=self.config['account'],
            database=self.config['database'],
            password=self.config['password'],
            schema=self.config['schema'],
            username=self.config['username'],
            warehouse=self.config['warehouse'],
            role=self.config.get('role'),
        )

    def build_create_table_commands(
        self,
        schema: Dict,
        schema_name: str,
        stream: str,
        table_name: str,
        database_name: str = None,
        unique_constraints: List[str] = None,
    ) -> List[str]:
        cmd = build_create_table_command(
            column_type_mapping=column_type_mapping(
                schema,
                convert_column_type,
                lambda item_type_converted: 'ARRAY',
            ),
            columns=schema['properties'].keys(),
            full_table_name=self.full_table_name(
                database_name,
                schema_name,
                table_name,
            ),
            unique_constraints=unique_constraints,
            column_identifier=self.quote,
            use_lowercase=self.use_lowercase,
        )

        return [
            cmd,
        ]

    def build_alter_table_commands(
        self,
        schema: Dict,
        schema_name: str,
        stream: str,
        table_name: str,
        database_name: str = None,
        unique_constraints: List[str] = None,
    ) -> List[str]:
        if self.disable_double_quotes:
            schema_name = schema_name.upper()

        query = f"""
SELECT
    column_name
    , data_type
FROM {database_name}.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = '{schema_name}' AND TABLE_NAME ILIKE '%{table_name}%'
        """
        results = self.build_connection().load(query)
        current_columns = [r[0].lower() for r in results]
        schema_columns = schema['properties'].keys()

        new_columns = [c for c in schema_columns
                       if self.clean_column_name(c)
                       not in current_columns]

        if not new_columns:
            return []

        # TODO: Support alter column types
        return [
            build_alter_table_command(
                column_type_mapping=column_type_mapping(
                    schema,
                    convert_column_type,
                    lambda item_type_converted: 'ARRAY',
                ),
                columns=new_columns,
                full_table_name=self.full_table_name(
                    database_name,
                    schema_name,
                    table_name,
                ),
                column_identifier=self.quote,
                use_lowercase=self.use_lowercase,
            ),
        ]

    def build_merge_command(
        self,
        columns: List[str],
        full_table_name: str,
        full_table_name_temp: str,
        unique_conflict_method: str = None,
        unique_constraints: List[str] = None,
    ) -> str:
        unique_constraints_clean = [
            self._wrap_with_quotes(self.clean_column_name(col))
            for col in unique_constraints
        ]
        columns_cleaned = [
            self._wrap_with_quotes(self.clean_column_name(col))
            for col in columns
        ]

        merge_commands = [
            f'MERGE INTO {full_table_name} AS a',
            f'USING (SELECT * FROM {full_table_name_temp}) AS b',
            f"ON {' AND '.join([f'a.{col} = b.{col}' for col in unique_constraints_clean])}",
        ]

        if UNIQUE_CONFLICT_METHOD_UPDATE == unique_conflict_method:
            set_command = ', '.join(
                [f'a.{col} = b.{col}' for col in columns_cleaned],
            )
            merge_commands.append(f'WHEN MATCHED THEN UPDATE SET {set_command}')

        insert_columns = ', '.join(columns_cleaned)
        merge_values = f"({', '.join([f'b.{col}' for col in columns_cleaned])})"
        merge_commands.append(
            f"WHEN NOT MATCHED THEN INSERT ({insert_columns}) VALUES {merge_values}",
        )
        merge_command = '\n'.join(merge_commands)

        return merge_command

    def build_insert_commands(
        self,
        records: List[Dict],
        schema: Dict,
        schema_name: str,
        table_name: str,
        database_name: str = None,
        unique_conflict_method: str = None,
        unique_constraints: List[str] = None,
    ) -> List[str]:
        full_table_name = self.full_table_name(database_name, schema_name, table_name)
        full_table_name_temp = self.full_table_name_temp(database_name, schema_name, table_name)

        columns = list(schema['properties'].keys())
        mapping = column_type_mapping(
            schema,
            convert_column_type,
            lambda item_type_converted: 'ARRAY',
        )
        insert_columns, insert_values = build_insert_command(
            column_type_mapping=mapping,
            columns=columns,
            convert_array_func=convert_array,
            convert_column_to_type_func=convert_column_if_json,
            records=records,
            column_identifier=self.quote,
            use_lowercase=self.use_lowercase,
        )

        insert_columns = ', '.join(insert_columns)
        insert_values = ', '.join(insert_values)

        select_values = []
        for idx, column in enumerate(columns):
            col = f'column{idx + 1}'
            col_type = mapping[column].get('type')

            if COLUMN_TYPE_OBJECT == col_type:
                col = f'TO_VARIANT(PARSE_JSON({col}))'
            elif COLUMN_TYPE_ARRAY == col_type:
                col = f'ARRAY_CONSTRUCT({col})'

            select_values.append(col)
        select_values = ', '.join(select_values)

        if unique_constraints and unique_conflict_method:
            drop_temp_table_command = f'DROP TABLE IF EXISTS {full_table_name_temp}'
            commands = [
                drop_temp_table_command,
            ] + self.build_create_table_commands(
                schema=schema,
                schema_name=schema_name,
                stream=None,
                table_name=f'temp_{table_name}',
                database_name=database_name,
                unique_constraints=unique_constraints,
            ) + ['\n'.join([
                f'INSERT INTO {full_table_name_temp} ({insert_columns})',
                f'SELECT {select_values}',
                f'FROM VALUES {insert_values}',
            ])]

            merge_command = self.build_merge_command(
                columns=columns,
                full_table_name=full_table_name,
                full_table_name_temp=full_table_name_temp,
                unique_conflict_method=unique_conflict_method,
                unique_constraints=unique_constraints,
            )

            return commands + [
                merge_command,
                drop_temp_table_command,
            ]

        return [
            '\n'.join([
                f'INSERT INTO {full_table_name} ({insert_columns})',
                f'SELECT {select_values}',
                f'FROM VALUES {insert_values}',
            ]),
        ]

    def build_create_schema_commands(
        self,
        database_name: str,
        schema_name: str,
    ) -> List[str]:
        return [
            f'USE DATABASE {database_name}',
        ] + super().build_create_schema_commands(database_name, schema_name)

    def full_table_name(self, database_name: str, schema_name: str, table_name: str) -> str:
        if self.disable_double_quotes:
            return f'{database_name}.{schema_name}.{table_name}'

        return f'"{database_name}"."{schema_name}"."{table_name}"'

    def full_table_name_temp(self, database_name: str, schema_name: str, table_name: str) -> str:
        if self.disable_double_quotes:
            return f'{database_name}.{schema_name}.temp_{table_name}'

        return f'"{database_name}"."{schema_name}"."temp_{table_name}"'

    def does_table_exist(
        self,
        schema_name: str,
        table_name: str,
        database_name: str = None,
    ) -> bool:
        # This method will fail if the schema didn’t exist prior to running this destination.
        # The create schema command will only commit if the entire transaction was successful.
        # Checking the existence of a table in a non-existent schema will fail.
        schema_name = schema_name.upper() if self.disable_double_quotes else schema_name
        table_name = table_name.upper() if self.disable_double_quotes else table_name

        query = f"""
SELECT
    *
FROM {self._wrap_with_quotes(database_name)}.INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = '{schema_name}' AND TABLE_NAME = '{table_name}'
"""
        data = self.build_connection().execute([query])
        return len(data[0]) >= 1

    def calculate_records_inserted_and_updated(
        self,
        data: List[List[Tuple]],
        unique_constraints: List[str] = None,
        unique_conflict_method: str = None,
    ) -> Tuple:
        records_inserted = 0
        records_updated = 0

        arr = []

        for _, array_of_tuples in enumerate(data):
            for t in array_of_tuples:
                if len(t) >= 1 and type(t[0]) is int:
                    arr.append(t)

        print(arr)

        if len(arr) == 1:
            if len(arr[0]) >= 1:
                if type(arr[0][0]) is int:
                    records_inserted += arr[0][0]
                if len(arr[0]) == 2 and type(arr[0][1]) is int:
                    records_updated += arr[0][1]
        elif unique_constraints and unique_conflict_method:
            for group in batch(arr, 2):
                row = group[1]
                if len(row) >= 1:
                    if type(row[0]) is int:
                        records_inserted += row[0]
                    if len(row) == 2 and type(row[1]) is int:
                        records_updated += row[1]
        else:
            for t in arr:
                if len(t) == 1 and type(t[0]) is int:
                    records_inserted += t[0]

        return records_inserted, records_updated

    def write_dataframe_to_table(
        self,
        df: "pd.Dataframe",
        database: str,
        schema: str,
        table: str,
    ) -> List[List[tuple]]:
        """
        Write a Pandas DataFrame to a table in a Snowflake database.

        Args:
            df (pd.DataFrame): The DataFrame to be written to the table.
            database (str): The name of the Snowflake database where the table exists.
            schema (str): The name of the schema within the database where the table is located.
            table (str): The name of the target table.

        Returns:
            List[List[tuple]]: A list containing a single tuple, where the tuple contains
            information about the number of rows written to the table.

        Note:
            The function relies on the `self.disable_double_quotes` attribute to determine
            whether to use uppercase for table, database, and schema names when constructing
            the SQL statement for writing. Make sure this attribute is appropriately set
            before calling this function.
        """
        self.logger.info(
            f'write_pandas to: {database}.{schema}.{table}')
        snowflake_connection = self.build_connection()
        connection = snowflake_connection.build_connection()
        if self.disable_double_quotes:
            df.columns = [col.upper() for col in df.columns]
        success, num_chunks, num_rows, output = write_pandas(
            connection,
            df,
            table.upper() if self.disable_double_quotes else table,
            database=database.upper() if self.disable_double_quotes else database,
            schema=schema.upper() if self.disable_double_quotes else schema,
            auto_create_table=False,
        )
        snowflake_connection.close_connection(connection)
        self.logger.info(
            f'write_pandas completed: {success}, {num_chunks} chunks, {num_rows} rows.')
        self.logger.info(f'write_pandas output: {output}')
        return [[(num_rows, num_rows)]]

    def process_queries(
        self,
        query_strings: List[str],
        record_data: List[Dict],
        stream: str,
        tags: Dict = None,
        **kwargs,
    ) -> List[List[Tuple]]:
        """
        Process and load data into Snowflake using batch or default SQL insertion.

        Args:
            query_strings (List[str]): List of SQL query strings for pre-processing.
            record_data (List[Dict]): List of dictionaries containing record data.
            stream (str): The name of the data stream.
            tags (Dict, optional): Dictionary of additional tags for the operation.
            **kwargs: Additional keyword arguments.

        Returns:
            List[List[Tuple]]: A list containing results of executed queries.

        Note:
            - The `use_batch_load` attribute determines whether to use batch load or
              default SQL insertion.
            - Make sure the `unique_constraints` and `unique_conflict_methods` are properly
              configured for batch load.
        """
        if not self.use_batch_load:
            self.logger.info('Using default SQL insertion load for Snowflake...')
            return super().process_queries(
                query_strings,
                record_data,
                stream,
                tags,
                **kwargs,
            )
        else:
            results = []
            self.logger.info('Using batch load for Snowflake...')

            unique_constraints = self.unique_constraints.get(stream)
            unique_conflict_method = self.unique_conflict_methods.get(stream)
            self.logger.info(f'Batch upload unique_constraints: {unique_constraints}')
            self.logger.info(f'Batch upload unique_conflict_method: {unique_conflict_method}')

            # Execute the query_strings before inserting the data, i.e., passed-in
            # query_strings including create table command or alter table command
            if query_strings and len(query_strings) > 0:
                self.logger.info(f'Executing query_strings: {query_strings}')
                results += self.build_connection().execute(query_strings, commit=True)
            else:
                self.logger.info(f'Skip executing empty query_strings: {query_strings}')

            df = pd.DataFrame([d['record'] for d in record_data])

            self.logger.info(f'Batch upload to Snowflake: {df.shape[0]} rows.')
            self.logger.info(f'Columns: {df.columns}')

            # Clean dataframe column names and values
            df = self.clean_df(df, stream)

            database = self.config.get(self.DATABASE_CONFIG_KEY)
            schema = self.config.get(self.SCHEMA_CONFIG_KEY)
            table = self.config.get(self.TABLE_CONFIG_KEY)
            full_table_name = self.full_table_name(database, schema, table)

            if unique_constraints and unique_conflict_method:
                full_table_name_temp = self.full_table_name_temp(database, schema, table)
                drop_temp_table_command = [f'DROP TABLE IF EXISTS {full_table_name_temp}']

                create_temp_table_command = self.build_create_table_commands(
                                schema=self.schemas[stream],
                                schema_name=schema,
                                stream=None,
                                table_name=f'temp_{table}',
                                database_name=database,
                                unique_constraints=unique_constraints,
                            )

                results += self.build_connection().execute(
                    drop_temp_table_command + create_temp_table_command, commit=True)

                # Outputs of write_dataframe_to_table are for temporary table only, thus not added
                # to results
                # results += self.write_dataframe_to_table(df, database, schema, f'temp_{table}')
                self.write_dataframe_to_table(df, database, schema, f'temp_{table}')
                self.logger.info(
                    f'write_dataframe_to_table completed to: {full_table_name_temp}')

                merge_command = [self.build_merge_command(
                    columns=df.columns,
                    full_table_name=full_table_name,
                    full_table_name_temp=full_table_name_temp,
                    unique_conflict_method=unique_conflict_method,
                    unique_constraints=unique_constraints,
                )]

                self.logger.info(f'Merging {full_table_name_temp} into {full_table_name}')
                self.logger.info(f'Dropping temporary table: {full_table_name_temp}')
                results += self.build_connection().execute(
                    merge_command + drop_temp_table_command, commit=True)
                self.logger.info(f'Merged and dropped temporary table: {full_table_name_temp}')
            else:
                results += self.write_dataframe_to_table(df, database, schema, table)
                self.logger.info(f'write_dataframe_to_table completed to {full_table_name}')

            return results

    def clean_df(self, df: pd.DataFrame, stream: str):
        # Clean column names in the dataframe
        col_mapping = {col: self.clean_column_name(col) for col in df.columns}
        df = df.rename(columns=col_mapping)

        # Serialize the dict or list to string
        def serialize_obj(val):
            if isinstance(val, dict) or isinstance(val, list):
                return simplejson.dumps(
                    val,
                    default=encode_complex,
                    ignore_nan=True,
                )
            return str(val)

        def remove_empty_dicts(val: Dict):
            # Remove empty dicts to avoid
            # insertion issues with write_pandas and
            # pyarrow
            if isinstance(val, dict) and len(val) == 0:
                return None
            # Checks if nested dict also contain
            # a empty dict
            elif isinstance(val, dict) and len(val) != 0:
                for key, value in val.items():
                    if isinstance(value, dict) and len(value) == 0:
                        val[key] = None
            return val

        mapping = column_type_mapping(
            self.schemas[stream],
            convert_column_type,
            lambda item_type_converted: 'ARRAY',
        )

        for col in col_mapping.keys():
            clean_col_name = col_mapping[col]
            df_col_dropna = df[clean_col_name].dropna()
            if df_col_dropna.count() == 0:
                continue
            col_type = mapping[col].get('type')
            col_settings = mapping[col].get('column_settings')
            if COLUMN_TYPE_STRING == col_type \
                    and COLUMN_FORMAT_DATETIME != col_settings.get('format'):
                df[clean_col_name] = df[clean_col_name].apply(lambda x: serialize_obj(x))
            elif COLUMN_TYPE_OBJECT == col_type:
                df[clean_col_name] = df[clean_col_name].apply(lambda x: remove_empty_dicts(x))
        return df


if __name__ == '__main__':
    main(Snowflake)
