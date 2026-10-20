import argparse
import sys

import pymongo

from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.mongodb.target_mongodb.target import TargetMongoDb


class MongoDb(Destination):
    def _process(self, input_buffer) -> None:
        self.config['state_path'] = self.state_file_path
        TargetMongoDb(config=self.config, logger=self.logger).listen_override(
            file_input=open(self.input_file_path, 'r'))

    def test_connection(self) -> None:
        client = pymongo.MongoClient(self.config['connection_string'],
                                     connectTimeoutMS=2000)
        if self.config['db_name'] not in client.list_database_names():
            raise Exception("DB Name not found in client")


if __name__ == '__main__':
    destination = MongoDb(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
