import re
from typing import Dict, List

from mage_integrations.connections.oracledb import OracleDB as OracleDBConnection
from mage_integrations.destinations.constants import (
    COLUMN_TYPE_OBJECT,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.destinations.oracledb.utils import (
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


class OracleDB(Destination):
    @property
    def host(self) -> str:
        return self.config['host']

    @property
    def port(self) -> str:
        return self.config['port']

    @property
    def service(self) -> str:
        return self.config['service']

    @property
    def user(self) -> str:
        return self.config['user']

    @property
    def password(self) -> str:
        return self.config['password']

    @property
    def database(self) -> str:
        return self.config['database']

    @property
    def mode(self) -> str:
        return self.config.get('mode') or 'thin'

    def build_connection(self) -> OracleDBConnection:
        return OracleDBConnection(
            host=self.host, password=self.password,
            user=self.user, port=self.port, service=self.service, mode=self.mode)

    def build_create_schema_commands(
        self,
        database_name: str,
        schema_name: str,
    ) -> List[str]:
        # "create schema" in oracle db has nothing to do with schema creation.
        # While a "schema" is a user ID and a collection of the users tables and indexes.
        return [
            'SELECT name FROM v$database',
        ]

    def test_connection(self) -> None:
        oracledb_connection = self.build_connection()
        conn = oracledb_connection.build_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT name FROM v$database")
        except Exception as exc:
            self.logger.error(f"test_connection exception: {exc}")
            raise exc
        finally:
            oracledb_connection.close_connection(conn)
        return

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
                    lambda item_type_converted: 'CHAR(255)',
                ),
                columns=schema['properties'].keys(),
                full_table_name=f'{table_name}',
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
FROM USER_TAB_COLUMNS
WHERE TABLE_NAME = '{table_name.upper()}'
""")
        current_columns = [r[0].lower() for r in results]
        schema_columns = schema['properties'].keys()
        new_columns = [c for c in schema_columns
                       if clean_column_name(c, handle_leading_underscore=False,
                                            lower_case=self.use_lowercase)
                       not in current_columns]

        if not new_columns:
            return []
        return [
            build_alter_table_command(
                column_type_mapping=column_type_mapping(
                    schema,
                    convert_column_type,
                    lambda item_type_converted: 'CHAR(255)',
                ),
                columns=new_columns,
                full_table_name=f'{table_name}',
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
                lambda item_type_converted: 'CHAR(255)',
            ),
            columns=columns,
            records=records,
            convert_column_to_type_func=convert_column_to_type,
            string_parse_func=lambda x, y: x.replace("'", "''").replace('\\', '\\\\')
            if COLUMN_TYPE_OBJECT == y['type'] else x,
            use_lowercase=self.use_lowercase,
        )
        insert_columns = ', '.join([clean_column_name(col, lower_case=self.use_lowercase)
                                    for col in insert_columns])
        insert_into = f'INTO {table_name} ({insert_columns})'
        commands = []
        columns_cleaned = [clean_column_name(col, lower_case=self.use_lowercase)
                           for col in columns]

        for insert_value in insert_values:
            if unique_constraints and unique_conflict_method:
                if UNIQUE_CONFLICT_METHOD_UPDATE == unique_conflict_method:
                    # Build update command
                    insert_value_without_left_parenthesis = re.sub(r"^\(", "", insert_value)
                    insert_value_strip = re.sub(r"\)$", "", insert_value_without_left_parenthesis)
                    updated_values = insert_value_strip.split(',')
                    updated_command = ', '.join([f'{col} = {updated_values[idx].strip()}'
                                                for idx, col in enumerate(columns_cleaned)])
                    update_command_constraint = ""
                    for idx, column in enumerate(columns):
                        if column in unique_constraints:
                            if len(update_command_constraint) == 0:
                                update_command_constraint += \
                                    f'{clean_column_name(column, lower_case=self.use_lowercase)} = {updated_values[idx]}' # noqa
                            else:
                                update_command_constraint += \
                                    f'AND {clean_column_name(column, lower_case=self.use_lowercase)} = {updated_values[idx]}' # noqa

                    insert_command = f'''
BEGIN
    INSERT {insert_into} VALUES {insert_value};
EXCEPTION
    WHEN DUP_VAL_ON_INDEX
    THEN
        UPDATE {table_name}
        SET {updated_command}
        WHERE {update_command_constraint};
    WHEN OTHERS THEN
        RAISE;
END;
'''
            else:
                # When there is no unique_constraints
                insert_command = f'INSERT {insert_into} VALUES {insert_value}'
            commands.append(insert_command)

        return commands

    def does_table_exist(
        self,
        schema_name: str,
        table_name: str,
        database_name: str = None,
    ) -> bool:
        oracledb_connection = self.build_connection()
        connection = oracledb_connection.build_connection()
        cursor = connection.cursor()
        cursor.execute(
            f'SELECT COUNT(*) FROM user_tables WHERE table_name = \'{table_name.upper()}\'')
        number_of_rows = cursor.fetchone()[0]
        oracledb_connection.close_connection(connection)
        if number_of_rows > 0:
            return True
        return False


if __name__ == '__main__':
    main(OracleDB)
