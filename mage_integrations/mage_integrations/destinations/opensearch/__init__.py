import argparse
import sys

from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.opensearch.target_opensearch.sinks import OpenSink
from mage_integrations.destinations.opensearch.target_opensearch.target import (
    TargetOpensearch,
)


class Opensearch(Destination):
    def _process(self, input_buffer) -> None:
        self.config['state_path'] = self.state_file_path
        TargetOpensearch(config=self.config,
                         logger=self.logger).listen_override(
            file_input=open(self.input_file_path, 'r')
        )

    def test_connection(self) -> None:
        target = TargetOpensearch(config=self.config,
                                  logger=self.logger)
        client = OpenSink(target=target,
                          stream_name='test',
                          schema={},
                          key_properties=None,).client
        client.cat.health()
        client.close()


if __name__ == '__main__':
    destination = Opensearch(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
