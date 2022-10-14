from dataclasses import dataclass
from opensearchpy import OpenSearch, RequestsHttpConnection
from opensearchpy.helpers import bulk
from requests_aws4auth import AWS4Auth
from typing import Dict, List
import boto3
import time


@dataclass
class OpensearchSinkConfig:
    host: str
    index_name: str


class OpenSearchSink():
    def __init__(self, config: Dict):
        if 'connector_type' in config:
            config.pop('connector_type')
        self.config = OpensearchSinkConfig(**config)

        # Initialize opensearch client
        session = boto3.Session()
        credentials = session.get_credentials()
        awsauth = AWS4Auth(
          credentials.access_key,
          credentials.secret_key,
          session.region_name,
          'es',
          session_token=credentials.token,
        )

        self.client = OpenSearch(
                hosts=[self.config.host],
                http_auth=awsauth,
                use_ssl=True,
                verify_certs=True,
                ssl_assert_hostname=False,
                ssl_show_warn=False,
                connection_class=RequestsHttpConnection
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
