import json
from typing import Dict, Generator, List, Tuple

from mage_integrations.connections.trino import Trino as TrinoConnection
from mage_integrations.destinations.constants import UNIQUE_CONFLICT_METHOD_UPDATE
from mage_integrations.destinations.sql.base import Destination
from mage_integrations.destinations.sql.utils import (
    build_alter_table_command,
    build_create_table_command,
    build_insert_command,
    clean_column_name,
)
from mage_integrations.destinations.sql.utils import (
    column_type_mapping as column_type_mapping_orig,
)
from mage_integrations.destinations.trino.utils import (
    convert_column_type,
    convert_json_or_string,
)
from mage_integrations.utils.dictionary import merge_dict

# https://trino.io/docs/current/develop/supporting-merge.html
MERGEABLE_CONNECTORS = [
    'blackhole',
    'delta-lake',
    'iceberg',
]


class TrinoConnector(Destination):
    BATCH_SIZE = 500
    DEFAULT_QUERY_MAX_LENGTH = 1_000_000

    @property
    def query_max_length(self):
        return self.config.get('query_max_length', self.DEFAULT_QUERY_MAX_LENGTH)

    def build_connection(self) -> TrinoConnection:
        return TrinoConnection(
            catalog=self.config['catalog'],
            host=self.config['host'],
            password=self.config.get('password'),
            port=self.config.get('port'),
            schema=self.config['schema'],
            username=self.config['username'],
            verify=self.config.get('ssl', False),
        )

    def build_create_table_commands(
        self,
        schema: Dict,
        schema_name: str,
        stream: str,
        table_name: str,
        database_name: str = None,
        unique_constraints: List[str] = None,
        temp_table: bool = False,
    ) -> List[str]:
        """
        Build create table commands for Trino
        """

        # Trino delta lake with glue matastore does not delete the underlying data
        # when dropping a table if the location is specified during table creation
        # as they are considered external tables
        # We want to be able to delete the underlying data when dropping a table
        # so we need to ignore the location for temp tables

        ignore_location_for_temp_tables = self.config.get('ignore_location_for_temp_tables', False)
        if temp_table and ignore_location_for_temp_tables:
            location = None
        else:
            location = self.table_location(table_name)

        return [
            build_create_table_command(
                column_identifier='"',
                column_type_mapping=self.column_type_mapping(schema),
                columns=schema['properties'].keys(),
                full_table_name=f'{schema_name}.{table_name}',
                if_not_exists=True,
                location=location,
                # Unique constraint is not supported
                # https://trino.io/docs/current/sql/create-table.html
                unique_constraints=None,
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
DESCRIBE {schema_name}.{table_name}
        """)
        current_columns = [r[0].lower() for r in results]
        schema_columns = schema['properties'].keys()
        new_columns = [c for c in schema_columns if clean_column_name(c) not in current_columns]

        if not new_columns:
            return []

        # TODO: Support alter column types
        return [
            build_alter_table_command(
                column_type_mapping=self.column_type_mapping(schema),
                columns=new_columns,
                full_table_name=f'{schema_name}.{table_name}',
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
    ) -> Generator[List[str], None, None]:
        full_table_name = f'{schema_name}.{table_name}'
        full_table_name_temp = f'{schema_name}.temp_{table_name}'

        columns = list(schema['properties'].keys())
        insert_columns, insert_values = build_insert_command(
            column_type_mapping=self.column_type_mapping(schema),
            columns=columns,
            records=records,
            convert_array_func=self.convert_array,
            string_parse_func=self.string_parse_func,
        )
        insert_columns = ', '.join(insert_columns)

        if self._support_merge_rows() and unique_constraints and unique_conflict_method:
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
                temp_table=True,
            ) + self.wrap_insert_commands([
                f'INSERT INTO {full_table_name_temp} ({insert_columns})',
                'VALUES {insert_values}',
            ])

            unique_constraints_clean = [clean_column_name(col) for col in unique_constraints]
            columns_cleaned = [clean_column_name(col) for col in columns]

            merge_commands = [
                f'MERGE INTO {full_table_name} AS a',
                f'USING (SELECT * FROM {full_table_name_temp}) AS b',
                f"ON {' AND '.join([f'a.{col} = b.{col}' for col in unique_constraints_clean])}",
            ]

            if UNIQUE_CONFLICT_METHOD_UPDATE == unique_conflict_method:
                set_command = ', '.join(
                    [f'{col} = b.{col}' for col in columns_cleaned],
                )
                merge_commands.append(f'WHEN MATCHED THEN UPDATE SET {set_command}')

            merge_values = f"({', '.join([f'b.{col}' for col in columns_cleaned])})"
            merge_commands.append(
                f"WHEN NOT MATCHED THEN INSERT ({insert_columns}) VALUES {merge_values}",
            )
            merge_command = '\n'.join(merge_commands)

            commands = commands + [
                merge_command,
                drop_temp_table_command,
            ]
        else:
            commands = self.wrap_insert_commands([
                f'INSERT INTO {schema_name}.{table_name} ({insert_columns})',
                'VALUES {insert_values}',
            ])

        fixed_query_payload_size = sum([len(c) for c in commands])
        value_payload_size = 0
        subbatch_insert_values = []
        for insert_value in insert_values:
            subbatch_insert_values.append(insert_value)
            value_payload_size += len(insert_value) + 2
            if value_payload_size + fixed_query_payload_size >= 0.9 * self.query_max_length:
                subbatch_insert_value_str = ', '.join(subbatch_insert_values)
                yield [c.replace('{insert_values}', subbatch_insert_value_str) for c in commands]
                subbatch_insert_values = []
                value_payload_size = 0
        subbatch_insert_value_str = ', '.join(subbatch_insert_values)
        yield [c.replace('{insert_values}', subbatch_insert_value_str) for c in commands]

    def column_type_mapping(self, schema: Dict) -> Dict:
        return column_type_mapping_orig(
            schema,
            convert_column_type,
            lambda item_type_converted: 'JSON',
        )

    def convert_array(self, value: str, column_type_dict: Dict) -> str:
        if len(value) == 0:
            return 'NULL'
        item_type_converted = column_type_dict['item_type_converted']

        if 'JSON' == item_type_converted.upper():
            return f"JSON '{json.dumps(value)}'"
        else:
            return f"CAST('{json.dumps(value)}' AS {item_type_converted})"

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

    def does_table_exist(
        self,
        schema_name: str,
        table_name: str,
        database_name: str = None,
    ) -> bool:
        tables = self.build_connection().load(
            f'SHOW TABLES FROM {schema_name} LIKE \'{table_name}\'',
        )
        return len(tables) > 0

    def process_queries(
        self,
        query_strings: List[str],
        record_data: List[Dict],
        stream: str,
        tags: Dict = None,
    ) -> List[List[Tuple]]:
        if tags is None:
            tags = {}
        results = []

        if self.debug:
            for qs in query_strings:
                print(qs, '\n')

        results += self.build_connection().execute(query_strings, commit=True)

        database_name = self.config.get(self.DATABASE_CONFIG_KEY)
        schema_name = self.config.get(self.SCHEMA_CONFIG_KEY)
        table_name = self.config.get(self.TABLE_CONFIG_KEY)

        schema = self.schemas[stream]
        unique_constraints = self.unique_constraints.get(stream)
        unique_conflict_method = self.unique_conflict_methods.get(stream)

        records = [d['record'] for d in record_data]

        idx = 0
        for cmds in self.build_insert_commands(
            database_name=database_name,
            records=records,
            schema=schema,
            schema_name=schema_name,
            table_name=table_name,
            unique_conflict_method=unique_conflict_method,
            unique_constraints=unique_constraints,
        ):
            tags2 = merge_dict(tags, dict(index=idx))
            self.logger.info(
                f'Build insert commands for batch {idx} completed.',
                tags=merge_dict(tags2, dict(insert_commands=len(cmds))),
            )
            query_string_size = sum([len(c) for c in cmds])
            self.logger.info(
                f'Execute {len(cmds)} commands, length: {query_string_size}',
                tags=tags,
            )
            results += self.build_connection().execute(cmds, commit=True)
            idx += 1

        return results

    def string_parse_func(self, value: str, column_type_dict: Dict) -> str:
        return convert_json_or_string(value, column_type_dict)

    def table_location(self, table_name):
        if not self.config.get('location'):
            return None
        location = self.config.get('location')
        if not location.endswith('/'):
            location += '/'
        return location + table_name

    def wrap_insert_commands(self, commands: List[str]) -> List[str]:
        commands_string = '\n'.join(commands)
        return [
            commands_string,
        ]

    def _support_merge_rows(self):
        return self.config['connector'] in MERGEABLE_CONNECTORS
