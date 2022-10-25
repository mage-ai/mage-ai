from mage_integrations.connections.sql.base import Connection
from redshift_connector import connect


class Redshift(Connection):
    def __init__(
        self,
        access_key_id: str = None,
        cluster_identifier: str = None,
        database: str = None,
        db_user: str = None,
        host: str = None,
        password: str = None,
        port: int = None,
        region: str = None,
        secret_access_key: str = None,
        user: str = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.access_key_id = access_key_id
        self.cluster_identifier = cluster_identifier
        self.database = database
        self.db_user = db_user
        self.host = host
        self.password = password
        self.port = port or 5439
        self.region = region
        self.secret_access_key = secret_access_key
        self.user = user

    def build_connection(self):
        # https://github.com/aws/amazon-redshift-python-driver#connection-parameters
        return connect(
            access_key_id=self.access_key_id,
            cluster_identifier=self.cluster_identifier,
            database=self.database,
            db_user=self.db_user,
            host=self.host,
            password=self.password,
            port=self.port,
            region=self.region,
            secret_access_key=self.secret_access_key,
            user=self.user,
        )
