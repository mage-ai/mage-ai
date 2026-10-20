from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.facebook_ads.tap_facebook import (
    BOOKMARK_KEYS,
    do_discover_with_except,
    do_sync_with_except,
    setup_account,
)
from mage_integrations.utils.dictionary import ignore_keys
from singer import catalog as catalog_singer
from typing import List


class FacebookAds(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        catalog = do_discover_with_except(return_streams=True)

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

    def sync(self, catalog: Catalog) -> None:
        account = setup_account(self.config)
        do_sync_with_except(account, catalog, self.state, logger=self.logger)

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        if stream_id in BOOKMARK_KEYS:
            return [BOOKMARK_KEYS[stream_id]]
        return []

    def test_connection(self):
        setup_account(self.config)


if __name__ == '__main__':
    main(FacebookAds, schemas_folder='tap_facebook/schemas')
