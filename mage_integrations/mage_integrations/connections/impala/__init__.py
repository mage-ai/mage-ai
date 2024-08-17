from impala.dbapi import connect

from mage_integrations.connections.sql.base import Connection


class Impala(Connection):
    def __init__(
        self,
        database: str,
        host: str,
        password: str,
        user: str,
        port: int = None,
    ):
        super().__init__()
        self.database = database
        self.host = host
        self.password = password
        self.port = port or 21050
        self.user = user

    def build_connection(self):
        connect_kwargs = dict(
            database=self.database,
            host=self.host,
            password=self.password,
            port=self.port,
            user=self.user,
        )

        return connect(**connect_kwargs)
