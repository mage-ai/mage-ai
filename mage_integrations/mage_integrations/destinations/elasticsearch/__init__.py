import argparse
import sys

from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.elasticsearch.target_elasticsearch.sinks import (
    ElasticSink,
)
from mage_integrations.destinations.elasticsearch.target_elasticsearch.target import (
    TargetElasticsearch,
)


class Elasticsearch(Destination):
    def _process(self, input_buffer) -> None:
        self.config['state_path'] = self.state_file_path
        TargetElasticsearch(config=self.config, logger=self.logger).listen_override(
            file_input=open(self.input_file_path, 'r')
        )

    def test_connection(self) -> None:
        target = TargetElasticsearch(config=self.config, logger=self.logger)
        client = ElasticSink(
            target=target,
            stream_name='test',
            schema={},
            key_properties=None,
        ).client
        client.cat.health()
        client.close()


if __name__ == '__main__':
    destination = Elasticsearch(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
