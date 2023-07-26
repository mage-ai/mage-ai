import argparse
import sys

from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.salesforce.target_salesforce.target import (
    TargetSalesforce,
)


class Salesforce(Destination):
    def process(self, input_buffer) -> None:
        self.config['state_path'] = self.state_file_path
        TargetSalesforce(config=self.config, logger=self.logger).listen_override(
            file_input=open(self.input_file_path, 'r'))


if __name__ == '__main__':
    destination = Salesforce(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True
    )
    destination.process(sys.stdin.buffer)
