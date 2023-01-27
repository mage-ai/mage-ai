from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.linkedin_ads.tap_linkedin_ads import do_discover
from mage_integrations.sources.linkedin_ads.tap_linkedin_ads.client import LinkedinClient, REQUEST_TIMEOUT
from mage_integrations.sources.linkedin_ads.tap_linkedin_ads.sync import sync as _sync
from mage_integrations.utils.dictionary import ignore_keys
from singer import catalog as catalog_singer
from typing import List


class LinkedinAds(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        catalog_entries = []

        with LinkedinClient(
            self.config.get('client_id', None),
            self.config.get('client_secret', None),
            self.config.get('refresh_token', None),
            self.config.get('access_token'),
            REQUEST_TIMEOUT,
            self.config['user_agent'],
        ) as client:
            catalog = do_discover(client, self.config, return_streams=True)

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
        with LinkedinClient(
            self.config.get('client_id', None),
            self.config.get('client_secret', None),
            self.config.get('refresh_token', None),
            self.config.get('access_token'),
            REQUEST_TIMEOUT,
            self.config['user_agent'],
        ) as client:
            _sync(
                client=client,
                config=self.config,
                catalog=catalog,
                state=self.state or {},
            )

    def test_connection(self):
        with LinkedinClient(
            self.config.get('client_id', None),
            self.config.get('client_secret', None),
            self.config.get('refresh_token', None),
            self.config.get('access_token'),
            REQUEST_TIMEOUT,
            self.config['user_agent'],
        ) as client:
            client.check_accounts(self.config)


if __name__ == '__main__':
    main(LinkedinAds, schemas_folder='tap_linkedin_ads/schemas')
