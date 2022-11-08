from mage_integrations.connections.mysql import (
    ConnectionMethod,
    MySQL as MySQLConnection
)
from mage_integrations.sources.base import main
from mage_integrations.sources.sql.base import Source
from typing import List


class MySQL(Source):
    def build_connection(self) -> MySQLConnection:
        return MySQLConnection(
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


if __name__ == '__main__':
    main(MySQL)
