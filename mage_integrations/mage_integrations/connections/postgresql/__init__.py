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
    ):
        super().__init__()
        self.database = database
        self.host = host
        self.password = password
        self.port = port or 5432
        self.username = username

    def build_connection(self):
        return connect(
            dbname=self.database,
            host=self.host,
            password=self.password,
            port=self.port,
            user=self.username,
        )
