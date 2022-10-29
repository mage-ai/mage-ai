from mage_integrations.connections.bigquery import BigQuery as BigQueryConnection
from mage_integrations.destinations.constants import UNIQUE_CONFLICT_METHOD_UPDATE
from mage_integrations.destinations.sql.base import Destination, main
from mage_integrations.destinations.sql.utils import (
    build_create_table_command,
    build_insert_command,
    column_type_mapping,
    convert_column_type,
)
from mage_integrations.destinations.utils import clean_column_name
from typing import Dict, List, Tuple


class BigQuery(Destination):
    def build_connection(self) -> BigQueryConnection:
        return BigQueryConnection(
            path_to_credentials_json_file=self.config['path_to_credentials_json_file'],
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
                full_table_name=f'{schema_name}.{table_name}',
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
        columns = list(schema['properties'].keys())
        insert_columns, insert_values = build_insert_command(
            column_type_mapping=column_type_mapping(
                schema,
                convert_column_type,
                lambda item_type_converted: f'{item_type_converted}[]',
            ),
            columns=columns,
            records=records,
        )
        insert_columns = ', '.join(insert_columns)
        insert_values = ', '.join(insert_values)

        commands = [
            f'INSERT INTO {database_name}.{schema}.{table_name} ({insert_columns})',
            f'VALUES {insert_values}',
        ]

        if unique_constraints and unique_conflict_method:
            unique_constraints = [clean_column_name(col) for col in unique_constraints]
            columns_cleaned = [clean_column_name(col) for col in columns]

            commands.append(f"ON CONFLICT ({', '.join(unique_constraints)})")
            if UNIQUE_CONFLICT_METHOD_UPDATE == unique_conflict_method:
                update_command = [f'{col} = EXCLUDED.{col}' for col in columns_cleaned]
                commands.append(
                    f"DO UPDATE SET {', '.join(update_command)}",
                )
            else:
                commands.append('DO NOTHING')

        commands_string = '\n'.join(commands)
        return [
            '\n'.join([
                f"WITH insert_rows_and_count AS ({commands_string} RETURNING 1)",
                'SELECT COUNT(*) FROM insert_rows_and_count',
            ]),
        ]

    def does_table_exist(
        self,
        schema_name: str,
        table_name: str,
        database_name: str = None,
    ) -> bool:
        data = self.build_connection().execute([f"""
SELECT 1
FROM `{database_name}.{schema_name}.__TABLES_SUMMARY__`
WHERE table_id = '{table_name}'
"""])
        print(data)
        return len(data[0]) >= 1

    def calculate_records_inserted_and_updated(
        self,
        data: List[List[Tuple]],
        unique_constraints: List[str] = None,
        unique_conflict_method: str = None,
    ) -> Tuple:
        records_inserted = 0
        for array_of_tuples in data:
            for t in array_of_tuples:
                if len(t) >= 1 and type(t[0]) is int:
                    records_inserted += t[0]

        return records_inserted, 0


if __name__ == '__main__':
    main(BigQuery)
