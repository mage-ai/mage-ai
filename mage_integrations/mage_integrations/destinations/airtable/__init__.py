import argparse
import sys
from typing import Dict, List

from mage_ai.io.utils import map_json_to_airtable
from mage_integrations.connections.airtable import Airtable as AirtableConnection
from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.utils import update_record_with_internal_columns


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
        client = self.build_client()

        tags = dict(
            records=len(record_data),
            stream=stream
        )

        self.logger.info(f"Creating Airtable table {stream}")

        fields = [
            {
                'name': column,
                'type': map_json_to_airtable(info['type']),
                **({'options': {'precision': 2}}
                   if map_json_to_airtable(info['type']) == 'number' else {})
            }
            for column, info in self.schemas[stream]['properties'].items()
        ]

        table = client.create_table(stream, fields)

        self.logger.info(f"Successfully created table {table.name}")

        self.logger.info('Export data started', tags=tags)

        # Add _mage_created_at and _mage_updated_at columns
        for r in record_data:
            r['record'] = update_record_with_internal_columns(r['record'])

        records = [item['record'] for item in record_data]
        table.batch_create(records)

        tags.update(
            records_inserted=len(record_data),
        )

        self.logger.info('Export data completed.', tags=tags)


if __name__ == '__main__':
    destination = Airtable(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
