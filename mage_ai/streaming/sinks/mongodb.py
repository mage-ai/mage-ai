import time
from dataclasses import dataclass, field
from typing import Dict, List

from pymongo import MongoClient

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink


@dataclass
class MongoDbConfig(BaseConfig):
    connection_string: str
    database_name: str
    collection_name: str
    unique_constraints: List = field(default_factory=list)


class MongoDbSink(BaseSink):
    config_class = MongoDbConfig

    def init_client(self):
        self.client = MongoClient(self.config.connection_string)
        self.database = self.client[self.config.database_name]
        self.collection = self.database[self.config.collection_name]

    def batch_write(self, messages: List[Dict]):
        if not messages:
            return
        output_docs = []
        for doc in messages:
            if type(doc) is dict:
                if self.config.unique_constraints and \
                        all(col in doc for col in self.config.unique_constraints):
                    # Upsert the record into the collection
                    query = {col: doc[col] for col in self.config.unique_constraints}
                    self.collection.update_one(query, {'$set': doc}, upsert=True)
                else:
                    output_docs.append(doc)
            else:
                output_docs.append({'data': doc})
        if output_docs:
            self.collection.insert_many(output_docs)
        self._print(f'Batch ingest {len(messages)} records, time={time.time()}.')
