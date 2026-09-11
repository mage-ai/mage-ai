from couchbase.auth import CertificateAuthenticator, PasswordAuthenticator
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from mage_integrations.connections.base import Connection
from typing import Optional

class Couchbase(Connection):
    def __init__(
        self,
        bucket: str,
        scope: str,
        connection_string: str,
        password: Optional[str],
        username: Optional[str],
        cert_path: Optional[str],
        trust_store_path: Optional[str],
        key_path: Optional[str]
    ):
        super().__init__()

        if password is not None:
            assert username is not None
            assert cert_path is None
            assert trust_store_path is None
            assert key_path is None
        else:
            assert username is None
            assert cert_path is not None
            assert trust_store_path is not None
            assert key_path is not None


        self.bucket = bucket
        self.scope = scope
        self.connection_string = connection_string
        self.password = password
        self.username = username
        self.cert_path = cert_path
        self.trust_store_path = trust_store_path
        self.key_path = key_path

    def get_bucket(self):
        if self.username is not None:
            auth = PasswordAuthenticator(self.username, self.password)
        else:
            auth_dict = dict(cert_path=self.cert_path, trust_store_path=self.trust_store_path, key_path=self.key_path)
            auth = CertificateAuthenticator(auth_dict)

        cluster = Cluster(self.connection_string, ClusterOptions(auth))
        return cluster.bucket(self.bucket)

    def get_scope(self):
        return self.get_bucket().scope(self.scope)

    def get_all_collections(self):
        collection_manager = self.get_bucket().collections()

        scopes = collection_manager.get_all_scopes()
        collection_names = []
        for scope in scopes:
            if scope.name == self.scope:
                collection_names = [c.name for c in scope.collections]

        return collection_names

    def load(self, query):
        return list(self.get_scope().query(query).rows())
