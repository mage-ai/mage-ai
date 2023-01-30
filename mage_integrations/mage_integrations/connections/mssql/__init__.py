from mage_integrations.connections.sql.base import Connection
import pymssql


class MSSQL(Connection):
    def __init__(
        self,
        database: str,
        host: str,
        password: str,
        username: str,
        port: int = 1433,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.database = database
        self.host = host
        self.password = password
        self.port = port or 1433
        self.username = username

        self.charset = 'utf8'
        self.tds_version = '7.3'

    def build_connection(self):
        connect_kwargs = dict(
            charset=self.charset,
            database=self.database,
            server=self.host,
            password=self.password,
            port=self.port,
            user=self.username,
            tds_version=self.tds_version,
        )
        return pymssql.connect(**connect_kwargs)
