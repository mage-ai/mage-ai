from dataclasses import dataclass
from typing import Any, Callable, Mapping, Optional

from bson.timestamp import Timestamp
from pymongo import MongoClient
from pymongo.typings import _Pipeline

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sources.base import BaseSource


@dataclass
class MongoDBConfig(BaseConfig):
    connection_str: str
    database: str
    collection: str = None
    batch_size: Optional[int] = 100
    pipeline: Optional[_Pipeline] = None
    operation_time: Optional[Timestamp] = None
    start_after: Optional[Mapping[str, Any]] = None


class MongoSource(BaseSource):
    config_class = MongoDBConfig

    def init_client(self):
        connection_str = self.config.connection_str
        database = self.config.database
        collection = self.config.collection
        batch_size = self.config.batch_size
        pipeline = self.config.pipeline
        operation_time = self.config.operation_time
        start_after = self.config.start_after
        self._print(f"Starting to MongoDB Stream for {database}")
        self._print(f"You can use this collection {collection}")
        self._print(f"You can use {connection_str}")
        self._print(f"You can use {batch_size}")
        self._print(f"You can use {pipeline}")
        self._print(f"You can use {operation_time}")
        self._print(f"You can use {start_after}")

    def read(self, handler: Callable):
        pass

    def batch_read(self, handler: Callable):
        self._print("Start getting message for MongoDB streaming.")
        try:
            client = MongoClient(self.config.connection_str)
            db = client.get_database(self.config.database)
            parsed_messages = []
            if self.config_class.collection:
                watch_args = {'batch_size': self.config.batch_size}
                if self.config_class.pipeline:
                    watch_args['pipeline'] = self.config.pipeline
                if self.config_class.operation_time:
                    watch_args['operation_time'] = self.config.operation_time
                if self.config_class.start_after:
                    watch_args['start_after'] = self.config.start_after
                with db[self.config_class.collection].watch(**watch_args) as stream:
                    for change in stream:
                        parsed_messages.append(change)
            if parsed_messages:
                self._print(f'Received {len(parsed_messages)} message. '
                            f'Sample: {parsed_messages[0]}.')
                handler(parsed_messages)

        except Exception as e:
            self._print(f"Error: {e}")
            raise
