from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.outreach.tap_outreach import check_auth
from mage_integrations.sources.outreach.tap_outreach.client import OutreachClient
from mage_integrations.sources.outreach.tap_outreach.discover import discover
from mage_integrations.sources.outreach.tap_outreach.sync import sync
from mage_integrations.utils.dictionary import ignore_keys
from singer import catalog as catalog_singer
from typing import List


class Outreach(Source):
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
                    **ignore_keys(stream, ['schema']),
                ))

        return Catalog(catalog_entries)

    def sync(self, catalog: Catalog) -> None:
        with OutreachClient(self.config, logger=self.logger) as client:
            check_auth(client)
            sync(
                client,
                self.config,
                catalog,
                self.state or {},
                self.config['start_date'],
                logger=self.logger,
            )

    def test_connection(self) -> None:
        with OutreachClient(self.config) as client:
            check_auth(client)


if __name__ == '__main__':
    main(Outreach, schemas_folder='tap_outreach/schemas')
