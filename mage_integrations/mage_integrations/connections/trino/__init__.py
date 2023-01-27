from mage_integrations.connections.sql.base import Connection
from mage_integrations.connections.trino.connection_wrapper import ConnectionWrapper
from trino.auth import BasicAuthentication


class Trino(Connection):
    def __init__(
        self,
        catalog: str,
        host: str,
        username: str,
        password: str = None,
        port: int = None,
        schema: str = None,
        verify: bool = False,
    ):
        super().__init__()
        self.catalog = catalog
        self.host = host
        self.password = password
        self.port = port or 8080
        self.schema = schema
        self.username = username
        self.verify = verify

    def build_connection(self):
        connect_kwargs = dict(
            catalog=self.catalog,
            host=self.host,
            port=self.port,
            schema=self.schema,
            user=self.username,
            verify=self.verify,
        )

        if self.password:
            connect_kwargs['auth'] = BasicAuthentication(self.username, self.password)
            connect_kwargs['http_scheme'] = 'https'

        return ConnectionWrapper(**connect_kwargs)
