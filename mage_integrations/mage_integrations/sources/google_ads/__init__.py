from typing import Dict, List

from singer import catalog as catalog_singer

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.google_ads.tap_google_ads.client import create_sdk_client
from mage_integrations.sources.google_ads.tap_google_ads.discover import (
    create_resource_schema,
    do_discover,
)
from mage_integrations.sources.google_ads.tap_google_ads.sync import do_sync
from mage_integrations.utils.dictionary import ignore_keys


class GoogleAds(Source):
    def discover(self, streams: List[str] = None) -> Catalog:

        resource_schema = create_resource_schema(self.config)

        catalog = do_discover(resource_schema)

        catalog_entries = []

        for stream in catalog['streams']:
            stream_id = stream['tap_stream_id']
            if not streams or stream_id in streams:
                schema = catalog_singer.Schema.from_dict(stream['schema'])
                catalog_entries.append(self.build_catalog_entry(
                    stream_id,
                    schema,
                    **ignore_keys(stream, ['schema']),
                ))

        return Catalog(catalog_entries)

    def sync(self, catalog: Catalog, properties: Dict = None) -> None:

        resource_schema = create_resource_schema(self.config)
        catalog = do_discover(resource_schema)
        do_sync(self.config, catalog, resource_schema, self.state)

    def test_connection(self) -> None:
        client = create_sdk_client(self.config)


if __name__ == '__main__':
    main(GoogleAds, schemas_folder='tap_google_ads/schemas')
