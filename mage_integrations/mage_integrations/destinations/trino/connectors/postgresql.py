from mage_integrations.connections.trino import Trino as TrinoConnection
from mage_integrations.destinations.postgresql import PostgreSQL
from mage_integrations.destinations.sql.utils import column_type_mapping as column_type_mapping_orig
from mage_integrations.destinations.trino.utils import convert_column_type, convert_json_or_string
from typing import Dict, List
import json


class TrinoPostgreSQL(PostgreSQL):
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

    def does_table_exist(
        self,
        schema_name: str,
        table_name: str,
        database_name: str = None,
    ) -> bool:
        return False

    def column_type_mapping(self, schema: Dict) -> Dict:
        return column_type_mapping_orig(
            schema,
            convert_column_type,
            lambda item_type_converted: 'JSON',
        )

    def convert_array(self, value: str, column_type_dict: Dict) -> str:
        if len(value) == 0:
            return 'NULL'

        return f"JSON '{json.dumps(value)}'"

    def string_parse_func(self, value: str, column_type_dict: Dict) -> str:
        return convert_json_or_string(value, column_type_dict)

    def wrap_insert_commands(self, commands: List[str]) -> List[str]:
        commands_string = '\n'.join(commands)
        return [
            commands_string,
        ]
