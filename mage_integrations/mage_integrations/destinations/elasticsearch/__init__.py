import argparse
import sys
from typing import Dict

from mage_integrations.destinations.base import Destination

from mage_integrations.destinations.elasticsearch.target_elasticsearch.target import TargetElasticsearch








class Elasticsearch(Destination):
    def __init__(self, argument_parser=None, batch_processing: bool = False, config: Dict = None, config_file_path: str = None, debug: bool = False, input_file_path: str = None, log_to_stdout: bool = False, settings: Dict = None, settings_file_path: str = None, state_file_path: str = None, test_connection: bool = False):
        print(config)
        super().__init__(argument_parser, batch_processing, config, config_file_path, debug, input_file_path, log_to_stdout, settings, settings_file_path, state_file_path, test_connection)



    def process(self,input_buffer):
        self.logger.info(self.config)
        TargetElasticsearch(config=self.config).listen_override(file_input=open(self.input_file_path,
                                                             'r'))



if __name__ == '__main__':
    destination = Elasticsearch(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
