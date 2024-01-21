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
        mode: str = 'thin',
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.host = host
        self.password = password
        self.port = port or 1521
        self.service = service
        self.user = user
        self.mode = mode

    def make_dsn(self):
        return "{}:{}/{}".format(self.host, self.port, self.service)

    def build_connection(self):
        if self.mode and self.mode.lower() == 'thick':
            self.logger.info('Initializing Oracle thick mode.')
            oracledb.init_oracle_client()
        return oracledb.connect(
            user=self.user, password=self.password, dsn=self.make_dsn())
