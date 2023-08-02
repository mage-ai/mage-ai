import argparse
import sys
import traceback

import pymongo

from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.mongodb.target_mongodb.target import TargetMongoDb


class MongoDb(Destination):
    def process(self, input_buffer) -> None:
        self.config['state_path'] = self.state_file_path
        class_name = self.__class__.__name__
        try:
            if self.should_test_connection:
                self.logger.info('Testing connection...')
                self.test_connection()
            else:
                TargetMongoDb(config=self.config, logger=self.logger).listen_override(
                    file_input=open(self.input_file_path, 'r'))
        except Exception as err:
            message = f'{class_name} process failed with error {err}.'
            self.logger.exception(message, tags=dict(
                error=str(err),
                errors=traceback.format_stack(),
                message=traceback.format_exc(),
            ))
            raise Exception(message)

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
