from typing import Dict, List, Tuple

from mage_integrations.connections.mssql import MSSQL as MSSQLConnection
from mage_integrations.destinations.constants import (
    COLUMN_TYPE_OBJECT,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.destinations.mssql.utils import (
    build_alter_table_command,
    build_create_table_command,
    clean_column_name,
    convert_column_type,
)
from mage_integrations.destinations.sql.base import Destination, main
from mage_integrations.destinations.sql.utils import (
    build_insert_command,
    column_type_mapping,
)


class MSSQL(Destination):

    def build_connection(self) -> MSSQLConnection:
        return MSSQLConnection(
            authentication=self.config.get('authentication'),
            database=self.config['database'],
            driver=self.config.get('driver'),
            host=self.config['host'],
            password=self.config['password'],
            port=self.config.get('port', 1433),
            username=self.config['username'],
        )

    def build_create_schema_commands(
        self,
        database_name: str,
        schema_name: str,
    ) -> List[str]:
        return [
            f"""
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = '{schema_name}' )
BEGIN
    EXEC ('CREATE SCHEMA [{schema_name}] AUTHORIZATION [dbo]')
END
            """,
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
                    lambda item_type_converted: 'TEXT',
                ),
                columns=schema['properties'].keys(),
                full_table_name=f'{schema_name}.{table_name}',
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
    , data_type
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '{table_name}' AND TABLE_SCHEMA = '{schema_name}'
        """)
        current_columns = [r[0].lower() for r in results]
        schema_columns = schema['properties'].keys()
        new_columns = [c for c in schema_columns
                       if clean_column_name(c, self.use_lowercase) not in current_columns]

        if not new_columns:
            return []

        # TODO: Support alter column types
        return [
            build_alter_table_command(
                column_type_mapping=column_type_mapping(
                    schema,
                    convert_column_type,
                    lambda item_type_converted: 'TEXT',
                ),
                columns=new_columns,
                full_table_name=f'{schema_name}.{table_name}',
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
        full_table_name = f'{schema_name}.{table_name}'

        columns = list(schema['properties'].keys())
        insert_columns, insert_values = build_insert_command(
            column_type_mapping=column_type_mapping(
                schema,
                convert_column_type,
                lambda item_type_converted: 'TEXT',
            ),
            columns=columns,
            records=records,
            string_parse_func=lambda x, y: x.replace("'", "''").replace('\\', '\\\\')
            if COLUMN_TYPE_OBJECT == y['type'] else x,
            use_lowercase=self.use_lowercase,
        )
        insert_columns = ', '.join([clean_column_name(col, self.use_lowercase)
                                    for col in insert_columns])
        insert_values = ', '.join(insert_values)

        # https://learn.microsoft.com/en-us/sql/t-sql/statements/merge-transact-sql?view=sql-server-ver16
        if unique_constraints and unique_conflict_method:
            columns_cleaned = [clean_column_name(col, self.use_lowercase) for col in columns]

            unique_constraints_clean = [clean_column_name(col, self.use_lowercase)
                                        for col in unique_constraints]

            merge_commands = [
                f'MERGE INTO {full_table_name} AS a',
                f'USING (VALUES {insert_values}) AS b({insert_columns})',
                f"ON {' AND '.join([f'a.{col} = b.{col}' for col in unique_constraints_clean])}",
            ]

            if UNIQUE_CONFLICT_METHOD_UPDATE == unique_conflict_method:
                set_command = ', '.join(
                    [f'a.{col} = b.{col}' for col in columns_cleaned],
                )
                merge_commands.append(f'WHEN MATCHED THEN UPDATE SET {set_command}')

            merge_values = f"({', '.join([f'b.{col}' for col in columns_cleaned])})"
            merge_commands.append(
                f"WHEN NOT MATCHED THEN INSERT ({insert_columns}) VALUES {merge_values};",
            )
            merge_command = '\n'.join(merge_commands)

            return [
                merge_command,
            ]
        commands = [
            f'INSERT INTO {full_table_name} ({insert_columns})',
            f'VALUES {insert_values}',
        ]

        return [
            '\n'.join(commands),
        ]

    def does_table_exist(
        self,
        schema_name: str,
        table_name: str,
        database_name: str = None,
    ) -> bool:
        connection = self.build_connection()
        data = connection.load('\n'.join([
            'SELECT * FROM information_schema.tables ',
            f'WHERE table_schema = \'{schema_name}\' AND table_name = \'{table_name}\'',
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
    main(MSSQL)
