from teradatasql import connect

from mage_integrations.connections.sql.base import Connection


class Teradata(Connection):
    """
    Use teradatasql library: https://github.com/Teradata/python-driver
    """
    def __init__(
        self,
        database: str = None,
        host: str = None,
        password: str = None,
        port: int = 1025,
        username: str = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.database = database
        self.host = host
        self.password = password
        self.port = port or 1025
        self.username = username

    def build_connection(self):
        return connect(
            database=self.database,
            dbs_port=self.port,
            host=self.host,
            password=self.password,
            user=self.username,
        )
