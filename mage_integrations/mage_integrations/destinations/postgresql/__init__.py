from typing import Dict, List, Tuple

from mage_integrations.connections.postgresql import PostgreSQL as PostgreSQLConnection
from mage_integrations.destinations.constants import (
    COLUMN_TYPE_OBJECT,
    INTERNAL_COLUMN_CREATED_AT,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.destinations.postgresql.utils import (
    convert_array,
    convert_column_type,
)
from mage_integrations.destinations.sql.base import Destination, main
from mage_integrations.destinations.sql.utils import (
    build_alter_table_command,
    build_create_table_command,
    build_insert_command,
)
from mage_integrations.destinations.sql.utils import (
    column_type_mapping as column_type_mapping_orig,
)


class PostgreSQL(Destination):
    @property
    def quote(self) -> str:
        return '"'

    def full_table_name(self, schema_name: str, table_name: str):
        return f'{self._wrap_with_quotes(schema_name)}.{self._wrap_with_quotes(table_name)}'

    def build_connection(self) -> PostgreSQLConnection:
        return PostgreSQLConnection(
            database=self.config['database'],
            host=self.config['host'],
            password=self.config['password'],
            port=self.config.get('port'),
            username=self.config['username'],
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
                column_type_mapping=self.column_type_mapping(schema),
                columns=schema['properties'].keys(),
                full_table_name=self.full_table_name(schema_name, table_name),
                if_not_exists=True,
                unique_constraints=unique_constraints,
                column_identifier=self.quote,
                key_properties=self.key_properties.get(stream),
                use_lowercase=self.use_lowercase,
            ),
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
        results = self.build_connection().load(f"""
SELECT
    column_name
    , data_type
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '{table_name}' AND TABLE_SCHEMA = '{schema_name}'
        """)
        current_columns = [self.clean_column_name(r[0]) for r in results]
        schema_columns = schema['properties'].keys()
        new_columns = [c for c in schema_columns if self.clean_column_name(c)
                       not in current_columns]

        if not new_columns:
            return []

        # TODO: Support alter column types
        return [
            build_alter_table_command(
                column_type_mapping=self.column_type_mapping(schema),
                columns=new_columns,
                full_table_name=self.full_table_name(schema_name, table_name),
                column_identifier=self.quote,
                use_lowercase=self.use_lowercase
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
            column_type_mapping=self.column_type_mapping(schema),
            columns=columns,
            records=records,
            convert_array_func=self.convert_array,
            string_parse_func=self.string_parse_func,
            column_identifier=self.quote,
            use_lowercase=self.use_lowercase,
        )
        insert_columns = ', '.join(insert_columns)
        insert_values = ', '.join(insert_values)

        commands = [
            f'INSERT INTO {self.full_table_name(schema_name, table_name)} ({insert_columns})',
            f'VALUES {insert_values}',
        ]

        if unique_constraints and unique_conflict_method:
            unique_constraints = [
                self._wrap_with_quotes(self.clean_column_name(col))
                for col in unique_constraints
            ]
            columns_cleaned = [
                self._wrap_with_quotes(self.clean_column_name(col))
                for col in columns if col != INTERNAL_COLUMN_CREATED_AT
            ]

            commands.append(f"ON CONFLICT ({', '.join(unique_constraints)})")
            if UNIQUE_CONFLICT_METHOD_UPDATE == unique_conflict_method:
                update_command = [f'{col} = EXCLUDED.{col}' for col in columns_cleaned]
                commands.append(
                    f"DO UPDATE SET {', '.join(update_command)}",
                )
            else:
                commands.append('DO NOTHING')

        return self.wrap_insert_commands(commands)

    def wrap_insert_commands(self, commands: List[str]) -> List[str]:
        commands_string = '\n'.join(commands)
        return [
            '\n'.join([
                f"WITH insert_rows_and_count AS ({commands_string} RETURNING 1)",
                'SELECT COUNT(*) FROM insert_rows_and_count',
            ]),
        ]

    def column_type_mapping(self, schema: Dict) -> Dict:
        return column_type_mapping_orig(
            schema,
            convert_column_type,
            lambda item_type_converted: f'{item_type_converted}[]',
            string_type='TEXT',
        )

    def convert_array(self, value: str, column_type_dict: Dict) -> str:
        return convert_array(value, column_type_dict)

    def string_parse_func(self, value: str, column_type_dict: Dict) -> str:
        if COLUMN_TYPE_OBJECT == column_type_dict['type']:
            return value.replace("'", "''")

        return value

    def does_table_exist(
        self,
        schema_name: str,
        table_name: str,
        database_name: str = None,
    ) -> bool:
        postgres_connection = self.build_connection()
        connection = postgres_connection.build_connection()
        with connection.cursor() as cursor:
            cursor.execute(
                f'SELECT * FROM pg_tables WHERE schemaname = \'{schema_name}\' AND '
                f'tablename = \'{table_name}\'',
            )
            count = cursor.rowcount

            table_exist = bool(count)
        postgres_connection.close_connection(connection)
        return table_exist

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
    main(PostgreSQL)
