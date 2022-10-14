from connections.google_analytics import GoogleAnalytics as GoogleAnalyticsConnection
from connections.google_analytics.constants import DIMENSIONS, METRICS
from singer import utils
from singer.schema import Schema
from sources.base import Source
from typing import List
from utils.dictionary import merge_dict
from utils.dictionary import merge_dict
import singer

LOGGER = singer.get_logger()


def build_schema_properties(properties_init: dict = {}) -> dict:
    properties = properties_init.copy()

    for key in DIMENSIONS + METRICS:
        properties[key] = Schema.from_dict(dict(
            type=[
                'integer',
                'null',
                'string',
            ],
        ))

    return properties


class GoogleAnalytics(Source):
    def load_data(self, bookmark: str = None, bookmark_column: str = None, **kwargs) -> List[dict]:
        connection = GoogleAnalyticsConnection(
            self.config['property_id'],
            self.config['credentials_info'],
        )
        results = connection.load(
            '2022-10-01',
            dimensions=['city', 'country'],
            metrics=['activeUsers', 'sessions', 'totalUsers', 'newUsers'],
        )

        if bookmark and bookmark_column:
            results = filter(lambda x: x[bookmark_column] > bookmark, results)

        return list(results)

    def build_catalog_entry(self, stream_id, schema, **kwargs):
        schema.properties = build_schema_properties(schema.properties)
        return super().build_catalog_entry(stream_id, schema, **kwargs)

    # def get_key_properties(self, stream_id: str) -> List[str]:
    #     return []

    # def get_valid_replication_keys(self, stream_id: str) -> List[str]:
    #     return []


@utils.handle_top_exception(LOGGER)
def main():
    args = utils.parse_args([])

    source = GoogleAnalytics(
        args.config,
        args.state,
        args.catalog,
        discover_mode=args.discover,
        key_properties=[],
        replication_key='city',
    )
    source.process()

if __name__ == '__main__':
    main()
