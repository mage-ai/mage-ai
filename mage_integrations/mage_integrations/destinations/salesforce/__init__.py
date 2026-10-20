import argparse
import sys
from dataclasses import asdict

from simple_salesforce import Salesforce as SF

from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.salesforce.target_salesforce.session_credentials import (
    SalesforceAuth,
    parse_credentials,
)
from mage_integrations.destinations.salesforce.target_salesforce.target import (
    TargetSalesforce,
)


class Salesforce(Destination):
    def _process(self, input_buffer) -> None:
        self.config['state_path'] = self.state_file_path
        TargetSalesforce(config=self.config, logger=self.logger).listen_override(
            file_input=open(self.input_file_path, 'r'))

    def test_connection(self) -> None:
        session_creds = SalesforceAuth.from_credentials(
            parse_credentials(self.config),
            domain=self.config["domain"],
            logger=self.logger
        ).login()
        self._sf_client = SF(**asdict(session_creds))


if __name__ == '__main__':
    destination = Salesforce(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True
    )
    destination.process(sys.stdin.buffer)
