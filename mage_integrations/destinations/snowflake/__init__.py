from mage_integrations.connections.snowflake import Snowflake as SnowflakeConnection
from mage_integrations.destinations.constants import UNIQUE_CONFLICT_METHOD_UPDATE
from mage_integrations.destinations.snowflake.utils import convert_column_type
from mage_integrations.destinations.sql.base import Destination, main
from mage_integrations.destinations.sql.utils import (
    build_create_table_command,
    build_insert_command,
    column_type_mapping,
)
from mage_integrations.destinations.utils import clean_column_name
from typing import Callable, Dict, List, Tuple


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
        insert_command_count_wrapper: Callable,
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
            records=records,
        )


        if unique_constraints and unique_conflict_method:
            drop_temp_table_command = f'DROP TABLE IF EXISTS {full_table_name_temp}'
            commands = [
                drop_temp_table_command,
            ] + self.build_create_table_commands(
                schema=schema,
                schema_name=schema_name,
                table_name=f'temp_{table_name}',
                database_name=database_name,
                unique_constraints=unique_constraints,
            ) + [
                f"INSERT INTO {full_table_name_temp} ({insert_columns}) VALUES {insert_values}",
            ]

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
            f"INSERT INTO {full_table_name} ({insert_columns}) VALUES {insert_values}",
        ]

    def does_table_exist(
        self,
        schema_name: str,
        table_name: str,
        database_name: str = None,
    ) -> bool:
        data = self.build_connection().execute([
            f'SHOW TABLES LIKE \'{table_name}\' IN SCHEMA {database_name}.{schema_name}',
        ])

        return len(data[0]) >= 1

    def calculate_records_inserted_and_updated(self, data: List[List[Tuple]]) -> Tuple:
        records_inserted = 0
        records_updated = 0
        number_of_data = len(data)

        for idx, array_of_tuples in enumerate(data):
            for t in array_of_tuples:
                if len(t) == 2 and type(t[0]) is int and type(t[1]) is int:
                    records_inserted += t[0]
                    records_updated += t[1]
                elif idx == number_of_data - 1 and len(t) == 1 and type(t[0]) is int:
                    records_inserted += t[0]

        return records_inserted, records_updated


if __name__ == '__main__':
    main(Snowflake)
