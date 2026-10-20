from google.analytics.data_v1beta.types.data import MetricType
from mage_integrations.connections.google_analytics import \
    GoogleAnalytics as GoogleAnalyticsConnection
from mage_integrations.connections.google_analytics.constants import DIMENSIONS, METRICS
from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_STRING,
    REPLICATION_METHOD_FULL_TABLE,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.sources.utils import get_standard_metadata

from mage_integrations.utils.schema_helpers import extract_selected_columns
from singer.schema import Schema
from typing import Dict, Generator, List
import singer

LOGGER = singer.get_logger()


class GoogleAnalytics(Source):
    ROW_LIMIT = 10000

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.connection = GoogleAnalyticsConnection(
            self.config['property_id'],
            path_to_credentials_json_file=self.config['path_to_credentials_json_file'],
        )

    def discover(self, streams: List[str] = None) -> Catalog:
        metadata = self.connection.get_metadata()
        properties = dict()
        stream_id = 'google_analytics_custom'
        unique_constraints = []
        valid_replication_keys = []

        for dim in metadata['dimensions']:
            column_format = None
            column_properties = None
            column_types = ['string']
            properties[dim.api_name] = dict(
                properties=column_properties,
                format=column_format,
                type=column_types,
            )
        for metric in metadata['metrics']:
            column_format = None
            column_properties = None
            column_types = [COLUMN_TYPE_NULL]
            if metric.type_ == MetricType.TYPE_INTEGER:
                column_types.append(COLUMN_TYPE_INTEGER)
            elif metric.type_ == MetricType.TYPE_FLOAT:
                column_types.append(COLUMN_TYPE_NUMBER)
            else:
                column_types.append(COLUMN_TYPE_STRING)

            properties[metric.api_name] = dict(
                properties=column_properties,
                format=column_format,
                type=column_types,
            )

        schema = Schema.from_dict(dict(
            properties=properties,
            type='object',
        ))
        metadata = get_standard_metadata(
            key_properties=unique_constraints,
            replication_method=REPLICATION_METHOD_FULL_TABLE,
            schema=schema.to_dict(),
            stream_id=stream_id,
            valid_replication_keys=unique_constraints + valid_replication_keys,
        )
        catalog_entry = CatalogEntry(
            key_properties=unique_constraints,
            metadata=metadata,
            replication_method=REPLICATION_METHOD_FULL_TABLE,
            schema=schema,
            stream=stream_id,
            tap_stream_id=stream_id,
            unique_conflict_method=UNIQUE_CONFLICT_METHOD_UPDATE,
            unique_constraints=unique_constraints,
        )

        streams = [catalog_entry]

        return Catalog(streams)

    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = {},
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        columns = extract_selected_columns(stream.metadata)
        dimensions = [c for c in columns if c in DIMENSIONS]
        metrics = [c for c in columns if c in METRICS]
        offset = 0
        while True:
            rows = self.connection.load(
                self.config.get('start_date'),
                end_date=self.config.get('end_date'),
                dimensions=dimensions,
                limit=self.ROW_LIMIT,
                metrics=metrics,
                offset=offset,
            )
            if not rows:
                return
            offset += len(rows)
            yield rows

    def get_forced_replication_method(self, stream_id):
        return REPLICATION_METHOD_FULL_TABLE

    def test_connection(self):
        self.connection.connect()


if __name__ == '__main__':
    main(GoogleAnalytics)
