from typing import List

from singer import catalog as catalog_singer

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.twitter_ads.tap_twitter_ads import (
    build_client,
    check_credentials,
    do_discover,
)
from mage_integrations.sources.twitter_ads.tap_twitter_ads.streams import STREAMS
from mage_integrations.sources.twitter_ads.tap_twitter_ads.streams import (
    TwitterAds as TwitterAdsStream,
)
from mage_integrations.sources.twitter_ads.tap_twitter_ads.sync import sync as do_sync


class TwitterAds(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        client = build_client(self.config)
        catalog = do_discover(
            self.config.get('reports', {}),
            client,
            self.config.get('account_ids'),
            logger=self.logger,
            return_streams=True,
            selected_streams=streams
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
        do_sync(client, self.config, catalog, self.state or {}, logger=self.logger)

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        value = STREAMS[stream_id].replication_key
        if type(value) is not list:
            value = [value]

        return value

    def test_connection(self):
        client = build_client(self.config)
        check_credentials(client, TwitterAdsStream(), self.config.get('account_ids'))


if __name__ == '__main__':
    main(TwitterAds, schemas_folder='tap_twitter_ads/schemas')
