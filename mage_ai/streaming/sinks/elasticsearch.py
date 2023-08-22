import time
from dataclasses import dataclass
from typing import Dict, List

from elasticsearch import Elasticsearch, helpers

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink


@dataclass
class ElasticSearchConfig(BaseConfig):
    host: str
    index_name: str
    verify_certs: bool = True
    api_key: str = None
    ca_cert: str = None
    _id: str = None


class ElasticSearchSink(BaseSink):
    config_class = ElasticSearchConfig

    def init_client(self):
        # Initialize elasticsearch client
        self.client = Elasticsearch(
                hosts=[self.config.host],
                api_key=self.config.api_key,
                ca_certs=self.config.ca_cert,
                verify_certs=self.config.verify_certs,
        )

    def test_connection(self):
        return True

    def write(self, data: Dict):
        self._print(f'[Elasticsearch] Ingest data {data}, time={time.time()}')
        self.client.index(
            index=self.config.index_name,
            body=data,
            refresh=True
        )

    def batch_write(self, data: List[Dict]):
        self._print(f'[Elasticsearch] Batch ingest data {data}, time={time.time()}')
        docs = [{'_index': self.config.index_name, '_source': doc} for doc in data]
        # for doc in docs:
        #     docs.append(f""{""_index": {self.config.index_name},"_id": {doc[self.config._id]}"}"")
        helpers.bulk(self.client, docs)
