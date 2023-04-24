from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.netsuite.tap_netsuite import (
    build_client,
    do_discover,
    do_sync,
)
from singer import catalog as catalog_singer
from typing import List


class Netsuite(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        client = build_client(self.config)
        catalog = do_discover(
            client,
            return_streams=True,
        )
        catalog_entries = []
        for stream in catalog['streams']:
            stream_id = stream['tap_stream_id']
            if not streams or stream_id in streams:
                schema = catalog_singer.Schema.from_dict(stream['schema'])
                catalog_entries.append(self.build_catalog_entry(stream_id, schema))

        return Catalog(catalog_entries)

    def sync(self, catalog: Catalog) -> None:
        client = build_client(self.config)
        do_sync(client, catalog, self.state or {}, logger=self.logger)

    def test_connection(self):
        client = build_client(self.config)
        client.connect_tba()


if __name__ == '__main__':
    main(Netsuite, schemas_folder='tap_twitter_ads/schemas')
