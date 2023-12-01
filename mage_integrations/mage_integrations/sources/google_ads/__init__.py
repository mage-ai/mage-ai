from typing import Dict, List

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.google_ads.tap_google_ads.client import create_sdk_client
from mage_integrations.sources.google_ads.tap_google_ads.discover import (
    create_resource_schema,
    do_discover,
)
from mage_integrations.sources.google_ads.tap_google_ads.sync import do_sync


class GoogleAds(Source):
    def discover(self, streams: List[str] = None) -> Catalog:

        resource_schema = create_resource_schema(self.config)

        catalog = do_discover(resource_schema)

        catalog_entries = []

        for stream in catalog['streams']:
            stream_id = stream['tap_stream_id']

            if not streams or stream_id in streams:
                catalog_entries.append(stream)

        return Catalog(catalog_entries)

    def sync(self, catalog: Catalog, properties: Dict = None) -> None:
        resource_schema = create_resource_schema(self.config)
        do_sync(self.config, catalog.to_dict(), resource_schema, self.state, logger=self.logger)

    def test_connection(self) -> None:
        data = self.config.get('login_customer_ids')
        # Select only the first login_customer_ids value to test
        create_sdk_client(self.config, data[0].get('loginCustomerId'))


if __name__ == '__main__':
    main(GoogleAds, schemas_folder='tap_google_ads/schemas')
