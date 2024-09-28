import argparse
import sys

from mage_integrations.connections.airtable import Airtable as AirtableConnection
from mage_integrations.destinations.base import Destination


class Airtable(Destination):
    """
   Airtable Destination for syncing data to Airtable
   """

    @property
    def base_id(self):
        return self.config.get('base_id')

    @property
    def table_name(self):
        return self.config.get('table_name')

    def build_client(self):
        """
        Build and return the Airtable API connection using the provided credentials.

        :return: AirtableConnection object.
        """
        self.logger.info(f"Building Airtable connection for base ID: {self.base_id}")
        connection = AirtableConnection(self.config['token'], self.base_id)
        return connection.build_connection()


if __name__ == '__main__':
    destination = Airtable(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
