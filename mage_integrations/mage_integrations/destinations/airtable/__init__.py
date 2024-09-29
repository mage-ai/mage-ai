import argparse
import sys
from typing import Dict, List

from mage_integrations.connections.airtable import Airtable as AirtableConnection
from mage_integrations.destinations.base import Destination


class Airtable(Destination):
    """
    Airtable Destination for syncing data to Airtable
    """

    @property
    def base_id(self):
        return self.config.get('base_id')

    def build_client(self):
        """
        Build and return the Airtable API connection using the provided credentials.

        :return: AirtableConnection object.
        """
        self.logger.info(f"Building Airtable connection for base ID: {self.base_id}")
        connection = AirtableConnection(self.config['token'], self.base_id)
        return connection.build_connection()

    def test_connection(self) -> None:
        """
        Test the Airtable connection.

        :raises Exception: If unable to connect or retrieve tables.
        """
        client = self.build_client()
        try:
            client.tables()
            self.logger.info("Airtable connection test successful.")
        except Exception as e:
            self.logger.error(f"Failed to test Airtable connection: {e}")
            raise

    def export_batch_data(self, record_data: List[Dict], stream: str, tags: Dict = None) -> None:
        """
        Export batch data to Airtable
        """
        pass


if __name__ == '__main__':
    destination = Airtable(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
