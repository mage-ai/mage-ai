from typing import Dict, Generator, List

import singer
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

LOGGER = singer.get_logger()


class Airtable(Source):
    @property
    def base_id(self):
        return self.config.get('base_id')

    @property
    def table_name(self):
        return self.config.get('table_name')

    def build_client(self):
        connection = AirtableConnection(self.config['token'], self.base_id)
        return connection.build_connection()

    def test_connection(self) -> None:
        client = self.build_client()
        client.tables()

    def load_data(
            self,
            stream,
            **kwargs,
    ) -> Generator[List[Dict], None, None]:
        """
        Load data from Source
        """
        table_name = stream.tap_stream_id.replace('_', ' ')
        client = self.build_client()
        table = client.table(table_name)
        rows = self.get_data(table)

        yield rows

    def discover(self, streams: List[str] = None) -> Catalog:
        client = self.build_client()
        tables = []
        if self.table_name:
            tables.append(client.table(self.table_name))
        elif self.selected_streams:
            for stream in self.selected_streams:
                stream = stream.replace('_', ' ')
                table = client.table(stream)
                tables.append(table)
        else:
            tables = client.tables()

        streams = []
        for table in tables:
            parts = table.name.split(' ')
            stream_id = '_'.join(parts)

            data = self.get_data(table)
            properties = {}
            for record in data:
                for k, v in record.items():
                    if type(v) is list:
                        col_type = COLUMN_TYPE_ARRAY
                    elif type(v) is dict:
                        col_type = COLUMN_TYPE_OBJECT
                    else:
                        col_type = COLUMN_TYPE_STRING
                    properties[k] = dict(
                        type=[
                            'null',
                            col_type
                        ]
                    )

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

            streams.append(catalog_entry)

        return Catalog(streams)

    def get_data(self, table: Table):
        data = table.all()
        flattened_data = []
        for record in data:
            flattened_record = {
                'id': record['id'],
                'createdTime': record['createdTime']
            }
            fields = record['fields']
            flattened_record.update(fields)
            flattened_data.append(flattened_record)

        return flattened_data


if __name__ == '__main__':
    main(Airtable)
