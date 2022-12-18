from mage_integrations.connections.snowflake import Snowflake as SnowflakeConnection
from mage_integrations.destinations.constants import (
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_OBJECT,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.destinations.snowflake.constants import SNOWFLAKE_COLUMN_TYPE_VARIANT
from mage_integrations.destinations.snowflake.utils import convert_column_type
from mage_integrations.destinations.sql.base import Destination, main
from mage_integrations.destinations.sql.utils import (
    build_create_table_command,
    build_insert_command,
    column_type_mapping,
    convert_column_to_type,
)
from mage_integrations.destinations.utils import clean_column_name
from mage_integrations.utils.array import batch
from typing import Dict, List, Tuple


def convert_array(value, column_settings):
    if type(value) is list:
        value_string = ', '.join([str(i) for i in value])
        return value_string

    return 'NULL'


def convert_column_if_json(value, column_type):
    if SNOWFLAKE_COLUMN_TYPE_VARIANT == column_type:
        value = (value.
            encode('unicode_escape').
            decode().
            replace("'", "\\'").
            replace('\\"', '\\\\"').
            replace('\\n', '\\\\n')
        )
        # Arrêté N°2018-61
        # Arr\u00eat\u00e9 N\u00b02018-61
        # b'Arr\\xeat\\xe9 N\\xb02018-61'
        # Arr\\xeat\\xe9 N\\xb02018-61

        return f"'{value}'"

    return convert_column_to_type(value, column_type)


class Snowflake(Destination):
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
        return [
            build_create_table_command(
                column_type_mapping=column_type_mapping(
                    schema,
                    convert_column_type,
                    lambda item_type_converted: 'ARRAY',
                ),
                columns=schema['properties'].keys(),
                full_table_name=f'"{database_name}"."{schema_name}"."{table_name}"',
                unique_constraints=unique_constraints,
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
        full_table_name = f'"{database_name}"."{schema_name}"."{table_name}"'
        full_table_name_temp = f'"{database_name}"."{schema_name}"."temp_{table_name}"'

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
            ) + '\n'.join([
                f'INSERT INTO {full_table_name_temp} ({insert_columns})',
                f'SELECT {select_values}',
                f'FROM VALUES {insert_values}',
            ])

            unique_constraints = [clean_column_name(col) for col in unique_constraints]
            columns_cleaned = [clean_column_name(col) for col in columns]

            merge_commands = [
                f'MERGE INTO {full_table_name} AS a',
                f'USING (SELECT * FROM {full_table_name_temp}) AS b',
                f"ON {', '.join([f'a.{col} = b.{col}' for col in unique_constraints])}",
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

        for idx, array_of_tuples in enumerate(data):
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


if __name__ == '__main__':
    main(Snowflake)
