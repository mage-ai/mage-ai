from mage_integrations.connections.sql.base import Connection
from psycopg2 import connect


class PostgreSQL(Connection):
    def __init__(
        self,
        database: str,
        host: str,
        password: str,
        username: str,
        port: int = None,
        connection_factory=None,
    ):
        super().__init__()
        self.database = database
        self.host = host
        self.password = password
        self.port = port or 5432
        self.username = username
        self.connection_factory = connection_factory

    def build_connection(self):
        connect_kwargs = dict(
            dbname=self.database,
            host=self.host,
            password=self.password,
            port=self.port,
            user=self.username,
        )
        if self.connection_factory is not None:
            connect_kwargs['connection_factory'] = self.connection_factory
        return connect(**connect_kwargs)
