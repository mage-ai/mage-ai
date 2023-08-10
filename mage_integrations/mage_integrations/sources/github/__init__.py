from typing import List

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.github.tap_github.client import GithubClient
from mage_integrations.sources.github.tap_github.discover import discover as _discover
from mage_integrations.sources.github.tap_github.sync import sync as _sync
from mage_integrations.utils.dictionary import ignore_keys
from singer import catalog as catalog_singer


class GitHub(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        client = GithubClient(self.config)
        catalog = _discover(client, logger=self.logger)

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
        client = GithubClient(self.config)
        _sync(client, self.config, self.state or {}, catalog.to_dict(), logger=self.logger)


if __name__ == '__main__':
    main(GitHub, schemas_folder='tap_github/schemas')
