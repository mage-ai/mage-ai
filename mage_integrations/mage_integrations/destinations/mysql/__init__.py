from typing import Dict, List, Tuple

from mage_integrations.connections.mysql import ConnectionMethod
from mage_integrations.connections.mysql import MySQL as MySQLConnection
from mage_integrations.destinations.constants import (
    COLUMN_TYPE_OBJECT,
    INTERNAL_COLUMN_CREATED_AT,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.destinations.mysql.utils import (
    build_alter_table_command,
    build_create_table_command,
    clean_column_name,
    convert_column_to_type,
    convert_column_type,
)
from mage_integrations.destinations.sql.base import Destination, main
from mage_integrations.destinations.sql.utils import (
    build_insert_command,
    column_type_mapping,
)


class MySQL(Destination):

    def build_connection(self) -> MySQLConnection:
        return MySQLConnection(
            database=self.config['database'],
            host=self.config['host'],
            password=self.config['password'],
            port=self.config.get('port'),
            username=self.config['username'],
            connection_method=self.config.get('connection_method', ConnectionMethod.DIRECT),
            conn_kwargs=self.config.get('conn_kwargs'),
            ssh_host=self.config.get('ssh_host'),
            ssh_port=self.config.get('ssh_port', 22),
            ssh_username=self.config.get('ssh_username'),
            ssh_password=self.config.get('ssh_password'),
            ssh_pkey=self.config.get('ssh_pkey'),
        )

    def build_create_schema_commands(
        self,
        database_name: str,
        schema_name: str,
    ) -> List[str]:
        return [
            f'CREATE SCHEMA IF NOT EXISTS {database_name}',
        ]

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
                    lambda item_type_converted: 'LONGTEXT',
                ),
                columns=schema['properties'].keys(),
                full_table_name=f'{database_name}.{table_name}',
                key_properties=self.key_properties.get(stream),
                schema=schema,
                unique_constraints=unique_constraints,
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
    , column_type
FROM information_schema.columns
WHERE table_name = '{table_name}' AND table_schema = '{database_name}'
        """)
        current_columns = [r[0].lower() if self.use_lowercase else r[0] for r in results]
        schema_columns = schema['properties'].keys()
        new_columns = [c for c in schema_columns
                       if self.clean_column_name(c) not in current_columns]

        if not new_columns:
            return []

        # TODO: Support alter column types
        return [
            build_alter_table_command(
                column_type_mapping=column_type_mapping(
                    schema,
                    convert_column_type,
                    lambda item_type_converted: 'LONGTEXT',
                ),
                columns=new_columns,
                full_table_name=f'{database_name}.{table_name}',
                use_lowercase=self.use_lowercase,
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
                lambda item_type_converted: 'LONGTEXT',
            ),
            columns=columns,
            records=records,
            convert_column_to_type_func=convert_column_to_type,
            string_parse_func=lambda x, y: x.replace("'", "''").replace('\\', '\\\\')
            if COLUMN_TYPE_OBJECT == y['type'] else x,
            use_lowercase=self.use_lowercase,
        )
        insert_columns = ', '.join([self.clean_column_name(col)
                                    for col in insert_columns])
        insert_values = ', '.join(insert_values)

        insert_into = f'INTO {table_name} ({insert_columns})'
        commands_after = []

        if unique_constraints and unique_conflict_method:
            if UNIQUE_CONFLICT_METHOD_UPDATE == unique_conflict_method:
                columns_cleaned = [self.clean_column_name(col)
                                   for col in columns]
                update_command = [f'{col} = new.{col}' for col in columns_cleaned
                                  if col != INTERNAL_COLUMN_CREATED_AT]
                commands_after += [
                    'AS new',
                    f"ON DUPLICATE KEY UPDATE {', '.join(update_command)}",
                ]
            else:
                insert_into = f'IGNORE {insert_into}'

        commands = [
            f'INSERT {insert_into}',
            f'VALUES {insert_values}',
        ] + commands_after

        return [
            '\n'.join(commands),
            # This will combine the count for number of rows inserted and number of rows updated.
            # For example, if it inserts 2 and updates 2, that will yield 4.
            'SELECT ROW_COUNT()',
        ]

    def clean_column_name(self, column_name: str):
        return clean_column_name(column_name, lower_case=self.use_lowercase)

    def does_table_exist(
        self,
        schema_name: str,
        table_name: str,
        database_name: str = None,
    ) -> bool:
        connection = self.build_connection()
        data = connection.load('\n'.join([
            'SELECT * FROM information_schema.tables ',
            f'WHERE table_schema = \'{database_name}\' AND table_name = \'{table_name}\'',
            'LIMIT 1',
        ]))

        return len(data) >= 1

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
    main(MySQL)
