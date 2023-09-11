import time
from dataclasses import dataclass
from typing import Dict, List

from pymongo import MongoClient

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink


@dataclass
class MongoDbConfig(BaseConfig):
    connection_string: str
    database_name: str
    collection_name: str


class MongoDbSink(BaseSink):
    config_class = MongoDbConfig

    def init_client(self):
        self.client = MongoClient(self.config.connection_string)
        self.database = self.client[self.config.database_name]
        self.collection = self.database[self.config.collection_name]

    def write(self, data: Dict):
        if type(data) is dict:
            self.collection.insert_one(data)
        else:
            self.collection.insert_one({"data": data})
        self._print(f'Ingest data {data}, time={time.time()}')

    def batch_write(self, data: List[Dict]):
        if not data:
            return
        output_docs = []
        for doc in data:
            if type(doc) is dict:
                output_docs.append(doc)
            else:
                output_docs.append({"data": doc})
        self.collection.insert_many(output_docs)
        self._print(f'Batch ingest {len(data)} records, time={time.time()}.')
