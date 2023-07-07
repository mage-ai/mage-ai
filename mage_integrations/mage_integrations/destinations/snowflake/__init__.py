from mage_ai.shared.hash import merge_dict
from mage_integrations.connections.snowflake import Snowflake as SnowflakeConnection
from mage_integrations.destinations.constants import (
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_OBJECT,
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
    clean_column_name,
    column_type_mapping,
)
from mage_integrations.utils.array import batch
from snowflake.connector.pandas_tools import write_pandas
from typing import Dict, List, Tuple
import pandas as pd


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
                       if clean_column_name(c) not in current_columns]

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
            ),
        ]

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

            unique_constraints_clean = [
                self._wrap_with_quotes(clean_column_name(col))
                for col in unique_constraints
            ]
            columns_cleaned = [
                self._wrap_with_quotes(clean_column_name(col))
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

            merge_values = f"({', '.join([f'b.{col}' for col in columns_cleaned])})"
            merge_commands.append(
                f"WHEN NOT MATCHED THEN INSERT ({insert_columns}) VALUES {merge_values}",
            )
            merge_command = '\n'.join(merge_commands)

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
        data = self.build_connection().execute([
            f'SHOW TABLES LIKE \'{table_name}\' IN SCHEMA {database_name}.{schema_name}',
        ])

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

    def process_queries(
        self,
        query_strings: List[str],
        record_data: List[Dict],
        stream: str,
        tags: Dict = None,
        **kwargs,
    ) -> List[List[Tuple]]:
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
            tries = tags.get('tries', 0)

            # Execute the query_strings before inserting the data, i.e., passed-in
            # query_strings including create table command or alter table command
            results += self.build_connection().execute(query_strings, commit=True)

            try:
                df = pd.DataFrame([d['record'] for d in record_data])
                table = self.config['table']
                database = self.config['database']
                schema = self.config['schema']
                self.logger.info(
                    f'write_pandas to: {database}.{schema}.{table}')
                success, num_chunks, num_rows, output = write_pandas(
                    self.build_connection().connection,
                    df,
                    table,
                    database=database,
                    schema=schema,
                    auto_create_table=True,
                )
                self.logger.info(
                    f'write_pandas completed: {success}, {num_chunks} chunks, {num_rows} rows.')
                self.logger.info(f'write_pandas output: {output}')
                results.append([(num_rows, num_rows)])
            except Exception as err:
                self.logger.error(f'Encountered exception: {err}')
                if tries < 2:
                    tries += 1
                    tags2 = merge_dict(tags, dict(tries=tries))
                    self.logger.info(
                        f'Batch upload to Snowflake failed, retry {tries}.',
                        tags=tags2,
                    )

                    return self.process_queries(
                        query_strings=query_strings,
                        record_data=record_data,
                        stream=stream,
                        tags=tags,
                        **kwargs,
                    )
                else:
                    raise err

            return results

if __name__ == '__main__':
    main(Snowflake)
