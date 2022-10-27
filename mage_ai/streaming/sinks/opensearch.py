from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink
from opensearchpy import OpenSearch, RequestsHttpConnection
from opensearchpy.helpers import bulk
from requests_aws4auth import AWS4Auth
from typing import Dict, List
import boto3
import time


@dataclass
class OpensearchConfig(BaseConfig):
    host: str
    index_name: str
    verify_certs: bool = True
    http_auth: str = '@awsauth'


class OpenSearchSink(BaseSink):
    config_class = OpensearchConfig

    def init_client(self):
        # Initialize opensearch client
        if self.config.http_auth == '@awsauth':
            session = boto3.Session()
            credentials = session.get_credentials()
            awsauth = AWS4Auth(
              credentials.access_key,
              credentials.secret_key,
              session.region_name,
              'es',
              session_token=credentials.token,
            )
            http_auth = awsauth
        else:
            http_auth = self.config.http_auth

        self.client = OpenSearch(
                hosts=[self.config.host],
                http_auth=http_auth,
                use_ssl=True,
                verify_certs=self.config.verify_certs,
                ssl_assert_hostname=False,
                ssl_show_warn=False,
                connection_class=RequestsHttpConnection,
        )

    def test_connection(self):
        return True

    def write(self, data: Dict):
        print(f'[Opensearch] Ingest data {data}, time={time.time()}')
        self.client.index(
            index=self.config.index_name,
            body=data,
            refresh=True
        )

    def batch_write(self, data: List[Dict]):
        print(f'[Opensearch] Batch ingest data {data}, time={time.time()}')
        docs = [{'_index': self.config.index_name, '_source': doc} for doc in data]
        bulk(self.client, docs)
