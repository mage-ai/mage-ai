import argparse
import sys

from opensearchpy import OpenSearch as Opensearch_client

from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.opensearch.target_opensearch.common import (
    API_KEY,
    API_KEY_ID,
    BEARER_TOKEN,
    HOST,
    PASSWORD,
    PORT,
    SCHEME,
    SSL_CA_FILE,
    USERNAME,
)
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
        config = {}
        scheme = self.config[SCHEME]
        if SSL_CA_FILE in self.config:
            scheme = "https"
            config["ca_certs"] = self.config[SSL_CA_FILE]

        config["hosts"] = [f"{scheme}://{self.config[HOST]}:{self.config[PORT]}"]

        if USERNAME in self.config and PASSWORD in self.config:
            config["basic_auth"] = (self.config[USERNAME], self.config[PASSWORD])
        elif API_KEY in self.config and API_KEY_ID in self.config:
            config["api_key"] = (self.config[API_KEY_ID], self.config[API_KEY])
        elif BEARER_TOKEN in self.config:
            config["bearer_auth"] = self.config[BEARER_TOKEN]
        else:
            self.logger.info("using default elastic search connection config")

        client = Opensearch_client(timeout=30, **config)
        client.cat.health()
        client.close()


if __name__ == '__main__':
    destination = Opensearch(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
