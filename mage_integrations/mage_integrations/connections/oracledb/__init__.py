import oracledb

from mage_integrations.connections.sql.base import Connection


class OracleDB(Connection):
    def __init__(
        self,
        host: str,
        password: str,
        user: str,
        port: int = None,
        service: str = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.host = host
        self.password = password
        self.port = port or 1521
        self.service = service
        self.user = user

    def make_dsn(self):
        return "{}:{}/{}".format(self.host, self.port, self.service)

    def build_connection(self):
        return oracledb.connect(
            user=self.user, password=self.password, dsn=self.make_dsn())
