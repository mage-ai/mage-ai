from typing import List

from mage_integrations.connections.mysql import ConnectionMethod
from mage_integrations.connections.mysql import MySQL as MySQLConnection
from mage_integrations.sources.base import main
from mage_integrations.sources.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_INTEGER,
)
from mage_integrations.sources.sql.base import Source


class MySQL(Source):
    def build_connection(self) -> MySQLConnection:
        return MySQLConnection(
            database=self.config['database'],
            host=self.config['host'],
            password=self.config['password'],
            port=self.config.get('port', 3306),
            username=self.config['username'],
            connection_method=self.config.get('connection_method', ConnectionMethod.DIRECT),
            conn_kwargs=self.config.get('conn_kwargs'),
            ssh_host=self.config.get('ssh_host'),
            ssh_port=self.config.get('ssh_port', 22),
            ssh_username=self.config.get('ssh_username'),
            ssh_password=self.config.get('ssh_password'),
            ssh_pkey=self.config.get('ssh_pkey'),
            verbose=0 if self.discover_mode or self.discover_streams_mode else 1,
        )

    def build_discover_query(self, streams: List[str] = None):
        database = self.config['database']

        query = f"""
SELECT
    TABLE_NAME
    , COLUMN_DEFAULT
    , COLUMN_KEY
    , COLUMN_NAME
    , COLUMN_TYPE
    , IS_NULLABLE
FROM information_schema.columns
WHERE table_schema = '{database}'
        """
        if streams:
            table_names = ', '.join([f"'{n}'" for n in streams])
            query = f'{query}\nAND TABLE_NAME IN ({table_names})'
        return query

    def column_type_mapping(self, column_type: str, column_format: str = None) -> str:
        if COLUMN_FORMAT_DATETIME == column_format:
            return 'DATETIME'
        elif COLUMN_TYPE_INTEGER == column_type:
            return 'UNSIGNED'
        return super().column_type_mapping(column_type, column_format)

    def update_column_names(self, columns: List[str]) -> List[str]:
        return list(map(lambda column: self.wrap_column_in_quotes(column), columns))

    def wrap_column_in_quotes(self, column: str) -> str:
        if "`" not in column:
            return f'`{column}`'

        return column


if __name__ == '__main__':
    main(MySQL)
