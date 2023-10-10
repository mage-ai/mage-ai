from pymongo import MongoClient
from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sources.base import BaseSource
from typing import Callable, List,Optional, Mapping, Any
from pymongo.typings import _Pipeline
from bson.timestamp import Timestamp

@dataclass
class MongoDBConfig(BaseConfig):
    connection_str: str
    database: str
    collection: str = None
    batch_size: Optional[int] = 100 #Maybe we talk about this
    pipeline: Optional[_Pipeline] = None #This is query for https://www.mongodb.com/docs/manual/changeStreams/#watch-a-collection--database--or-deployment
    start_at_operation_time: Optional[Timestamp] = None,
    start_after: Optional[Mapping[str,Any]] = None




class MongoSource(BaseSource):
    config_class = MongoDBConfig

    def read(self,handler:Callable):
        pass

    def batch_read(self, handler: Callable):
        self._print("Start getting message for MongoDB streaming.")
        try:
            client = MongoClient(self.config_class.connection_str)
            db = client.get_database(self.config_class.database)
            parsed_messages = []

            if self.config_class.collection:
                watch_args = {'batch_size': self.config_class.batch_size}
                if self.config_class.pipeline:
                    watch_args['pipeline'] = self.config_class.pipeline
                if self.config_class.start_at_operation_time:
                    watch_args['start_at_operation_time'] = self.config_class.start_at_operation_time

                if self.config_class.start_after:
                    watch_args['start_after'] = self.config_class.start_after

                with db[self.config_class.collection].watch(**watch_args) as stream:
                    for change in stream:
                        parsed_messages.append(change)

            if parsed_messages:
                self._print(f'Received {len(parsed_messages)} message. '
                            f'Sample: {parsed_messages[0]}.')
                handler(parsed_messages)

        except Exception as e:
            self._print("Check the values of connection_str, database, and collection: {},{},{}".format(
                self.config_class.connection_str, self.config_class.database, self.config_class.collection))
            self._print(f"Error: {e}")
            raise

"""
    def collection_read(self,handler:Callable):
        config_class = MongoDBConfig
        self._print("Start getting message for MongoDB streaming.")
        try:
            client = MongoClient(config_class.connection_str)
            db = client.get_database(config_class.database)
            parsed_messages = []
            if config_class.collection is not None and config_class.pipeline is not None:
                with db.config_class.collection.watch(batch_size=config_class.batch_size,pipeline=config_class.pipeline) as stream:
                    for change in stream:
                        parsed_messages.append(change)


            elif config_class.collection is not None and config_class.pipeline is None:
                with db.config_class.collection.watch(batch_size=config_class.batch_size) as stream:
                    for change in stream:
                        parsed_messages.append(change)


            if len(parsed_messages) > 0:
                self._print(f'Received {len(parsed_messages)} message. '
                            f'Sample: {parsed_messages[0]}.')
                handler(parsed_messages)

        except Exception:
            self._print("Check the values of connection_str , database and collection {},{},{}".format(config_class.connection_str,config_class.database,config_class.collection))
            raise
"""












