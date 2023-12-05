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
    batch_size: Optional[int] = 10
    pipeline: Optional[_Pipeline] = None
    operation_time: Optional[Timestamp] = None
    start_after: Optional[Mapping[str, Any]] = None


class MongoSource(BaseSource):
    config_class = MongoDBConfig

    def init_client(self):
        self.client = MongoClient(self.config.connection_str)

    def read(self, handler: Callable):
        pass

    def build_watch_args(self):
        """Build the watch arguments based on config attributes."""
        watch_args = {}

        # Check each parameter and append to watch_args if present
        if hasattr(self.config, 'batch_size') and self.config.batch_size is not None:
            watch_args['batch_size'] = self.config.batch_size

        if hasattr(self.config, 'pipeline') and self.config.pipeline is not None:
            watch_args['pipeline'] = self.config.pipeline

        if hasattr(self.config, 'operation_time') and self.config.operation_time is not None:
            watch_args['operation_time'] = self.config.operation_time

        if hasattr(self.config, 'start_after') and self.config.start_after is not None:
            watch_args['start_after'] = self.config.start_after

        return watch_args

    def batch_read(self, handler: Callable):
        self._print("Start getting message for MongoDB streaming.")
        try:
            db = self.client.get_database(self.config.database)
            self._print(db)

            if self.config.collection:
                watch_args = self.build_watch_args()
                collection = db[self.config.collection]

                with collection.watch(**watch_args) as stream:
                    for change in stream:
                        self._print(f'Received a new message: {change}.')
                        handler([change])  # Pass only the new change

        except Exception as e:
            # Handle potential exceptions when working with external systems.
            self._print(f"Error reading from MongoDB: {e}")
