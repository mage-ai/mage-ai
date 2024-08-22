import argparse
import sys
from typing import Dict, List

from mage_integrations.connections.couchbase import Couchbase as CouchbaseConnection
from mage_integrations.destinations.base import Destination


class Couchbase(Destination):

    def build_connection(self) -> CouchbaseConnection:
        return CouchbaseConnection(
            bucket=self.config['bucket'],
            scope=self.config['scope'],
            connection_string=self.config['connection_string'],
            password=self.config['password'],
            username=self.config['username']
        )

    def export_batch_data(self, record_data: List[Dict], stream: str) -> None:
        pass

    def test_connection(self):
        self.build_connection().get_bucket()


if __name__ == '__main__':
    destination = Couchbase(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
