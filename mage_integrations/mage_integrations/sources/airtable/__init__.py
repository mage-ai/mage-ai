from typing import Dict, Generator, List

from pyairtable import Table
from singer.schema import Schema

from mage_integrations.connections.airtable import Airtable as AirtableConnection
from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
    REPLICATION_METHOD_FULL_TABLE,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.sources.utils import get_standard_metadata


class Airtable(Source):
    """
    A source connector class for syncing data from Airtable.
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

    def test_connection(self) -> None:
        """
        Test the Airtable connection by retrieving available tables.

        :raises Exception: If unable to connect or retrieve tables.
        """
        self.logger.info("Testing Airtable connection...")
        client = self.build_client()
        try:
            client.tables()
            self.logger.info("Airtable connection test successful.")
        except Exception as e:
            self.logger.error(f"Failed to test Airtable connection: {e}")
            raise

    def load_data(
            self,
            stream,
            **kwargs,
    ) -> Generator[List[Dict], None, None]:
        """
        Load data from an Airtable table.
        Converts stream name to the corresponding table and retrieves records.

        :param stream: Stream name (Airtable table name).
        :param kwargs: Additional arguments.
        :return: A generator yielding a list of records (dictionaries).
        """
        table_name = stream.tap_stream_id.replace('_', ' ')
        self.logger.info(f"Loading data from table: {table_name}")
        client = self.build_client()
        table = client.table(table_name)
        rows = self.get_data(table)
        self.logger.info(f"Loaded {len(rows)} rows from {table_name}")
        yield rows

    def discover(self, streams: List[str] = None) -> Catalog:
        """
        Discover Airtable tables and their schemas to build a catalog.

        :param streams: Optional list of stream (table) names to discover.
        :return: A Catalog object containing stream metadata.
        """
        self.logger.info("Discovering tables and building catalog...")
        client = self.build_client()
        tables = []

        # If a specific table name is provided, use it; otherwise, get all tables.
        if self.table_name:
            self.logger.info(f"Using configured table name: {self.table_name}")
            tables.append(client.table(self.table_name))
        elif self.selected_streams:
            self.logger.info("Using selected streams for table discovery.")
            for stream in self.selected_streams:
                stream = stream.replace('_', ' ')
                table = client.table(stream)
                tables.append(table)
        else:
            self.logger.info("Retrieving all tables from Airtable.")
            tables = client.tables()

        # Build the catalog based on discovered tables.
        streams = []
        for table in tables:
            parts = table.name.split(' ')
            stream_id = '_'.join(parts)

            data = self.get_data(table)
            properties = {}

            # Generate schema properties from sample data.
            for record in data:
                for k, v in record.items():
                    if isinstance(v, list):
                        col_type = COLUMN_TYPE_ARRAY
                    elif isinstance(v, dict):
                        col_type = COLUMN_TYPE_OBJECT
                    else:
                        col_type = COLUMN_TYPE_STRING
                    properties[k] = dict(
                        type=['null', col_type]
                    )

            # Define schema and catalog entry.
            schema = Schema.from_dict(dict(
                properties=properties,
                type='object',
            ))

            metadata = get_standard_metadata(
                key_properties=[],
                replication_method=REPLICATION_METHOD_FULL_TABLE,
                schema=schema.to_dict(),
                stream_id=stream_id,
            )

            catalog_entry = CatalogEntry(
                key_properties=[],
                metadata=metadata,
                replication_method=REPLICATION_METHOD_FULL_TABLE,
                schema=schema,
                stream=stream_id,
                tap_stream_id=stream_id,
                unique_conflict_method=UNIQUE_CONFLICT_METHOD_UPDATE,
            )

            self.logger.info(f"Discovered table {table.name} with {len(properties)} properties.")
            streams.append(catalog_entry)

        self.logger.info(f"Catalog discovery completed. Discovered {len(streams)} streams.")
        return Catalog(streams)

    def get_data(self, table: Table):
        """
        Retrieve and flatten records from an Airtable table.

        :param table: Airtable table object.
        :return: List of flattened records (dictionaries).
        """
        self.logger.info(f"Fetching data from Airtable table: {table.name}")
        data = table.all()
        flattened_data = []

        # Flatten records for easier processing.
        for record in data:
            flattened_record = {
                'id': record['id'],
                'createdTime': record['createdTime']
            }
            fields = record['fields']
            flattened_record.update(fields)
            flattened_data.append(flattened_record)

        self.logger.info(f"Retrieved {len(flattened_data)} records from table {table.name}")
        return flattened_data


if __name__ == '__main__':
    main(Airtable)
