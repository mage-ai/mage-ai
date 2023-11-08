from typing import Any, Dict, Generator, List, Tuple
import teradatasql
from mage_integrations.connections.teradata import ConnectionMethod
from mage_integrations.connections.teradata import Teradata as TeradataConnection
from mage_integrations.sources.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_INTEGER,
)
from mage_integrations.sources.teradata.base import Source
from mage_integrations.sources.base import main

class Teradata(Source):
    def build_connection(self) -> TeradataConnection:
        return TeradataConnection(
            database=self.config['database'],
            host=self.config['host'],
            password=self.config['password'],
            port=self.config.get('port', 3306),
            username=self.config['username'],
            connection_method=self.config.get('connection_method', ConnectionMethod.DIRECT),
            ssh_host=self.config.get('ssh_host'),
            ssh_port=self.config.get('ssh_port', 22),
            ssh_username=self.config.get('ssh_username'),
            ssh_password=self.config.get('ssh_password'),
            ssh_pkey=self.config.get('ssh_pkey'),
            verbose=0 if self.discover_mode or self.discover_streams_mode else 1,
        )

    """def close_connection(self)->TeradataConnection:
        TeradataConnection.close_connection()
        if self.ssh_tunnel is not None:
            self.ssh_tunnel.stop()
            self.ssh_tunnel = None"""

        #client.close_connection(Teradata)

    def build_discover_query(self, streams: List[str]):
        database = self.config['database']

        query = f"""
    SELECT TableName, DefaultValue, ColumnConstraint, ColumnName, ColumnType, Nullable
    FROM DBC.ColumnsV
    WHERE DatabaseName = '{database}'
            """

        if streams:
            table_names = ', '.join([f"'{n}'" for n in streams])
            query = f'{query}\nAND TableName IN ({table_names})'
        return query

    def test_connection(self) -> None:
        conn = self.build_connection()

    def column_type_mapping(self, column_type: str, column_format: str = None) -> str:
        if COLUMN_FORMAT_DATETIME == column_format:
            return 'DATETIME'
        elif COLUMN_TYPE_INTEGER == column_type:
            return 'UNSIGNED'
        return super().column_type_mapping(column_type, column_format)

    def update_column_names(self, columns: List[str]) -> List[str]:
        return columns

if __name__ == '__main__':
    main(Teradata)



