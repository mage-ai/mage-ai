from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink
from typing import Dict, List
import time
from pymongo import MongoClient


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
        self.collection.insert_one({"_source": data})
        self._print(f'[MongoDB] Ingest data {data}, time={time.time()}')

    def batch_write(self, data: List[Dict]):
        if not data:
            return
        docs = [{'_source': doc} for doc in data]
        self.collection.insert_many(docs)
        self._print(f'[MongoDB] Batch ingest {len(data)} records, time={time.time()}.')
