from couchbase.auth import PasswordAuthenticator
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from mage_integrations.connections.base import Connection


class Couchbase(Connection):
    def __init__(
        self,
        bucket: str,
        scope: str,
        host: str,
        password: str,
        username: str,
    ):
        super().__init__()
        self.bucket = bucket
        self.scope = scope
        self.host = host
        self.password = password
        self.username = username

    def get_bucket(self):
        auth = PasswordAuthenticator(self.username, self.password)
        cluster = Cluster(f'couchbases://{self.host}', ClusterOptions(auth))
        return cluster.bucket(self.bucket)

    def get_scope(self):
        return self.get_bucket().scope(self.scope)

    def load(self, query):
        return list(self.get_scope().query(query).rows())
