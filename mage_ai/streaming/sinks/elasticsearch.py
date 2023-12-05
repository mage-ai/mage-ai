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

    def write(self, message: Dict):
        self._print(f'Ingest data {message}, time={time.time()}')
        if self.config._id is not None:
            self.client.index(
                index=self.config.index_name,
                body=message,
                id=message[self.config._id],
                refresh=True
            )
        else:
            self.client.index(
                index=self.config.index_name,
                body=message,
                refresh=True
            )

    def batch_write(self, messages: List[Dict]):
        self._print(f'Batch ingest data {messages}, time={time.time()}')
        if self.config._id is not None:
            docs = [{'_index': self.config.index_name, '_id': doc[self.config._id],
                     'doc': doc} for doc in messages]
        else:
            docs = [{'_index': self.config.index_name, 'doc': doc} for doc in messages]
        helpers.bulk(self.client, docs)
