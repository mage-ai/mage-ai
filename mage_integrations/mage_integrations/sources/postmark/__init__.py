from typing import List

from singer import catalog as catalog_singer

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.postmark.tap_postmark.discover import discover
from mage_integrations.sources.postmark.tap_postmark.postmark import (
    Postmark as PostmarkClient,
)
from mage_integrations.sources.postmark.tap_postmark.sync import sync


class Postmark(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        catalog = discover().to_dict()

        catalog_entries = []
        for stream in catalog['streams']:
            stream_id = stream['tap_stream_id']
            if not streams or stream_id in streams:
                schema = catalog_singer.Schema.from_dict(stream['schema'])
                catalog_entries.append(self.build_catalog_entry(
                    stream_id,
                    schema,
                    replication_key=stream.get('replication_key'),
                ))

        return Catalog(catalog_entries)

    def sync(self, catalog: Catalog) -> None:
        postmark = PostmarkClient(
            self.config['postmark_server_token'],
            logger=self.logger,
        )
        sync(postmark, self.state or {}, catalog, self.config['start_date'])

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        return ['date']


if __name__ == '__main__':
    main(Postmark, schemas_folder='tap_postmark/schemas')
