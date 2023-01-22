from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.hubspot.tap_hubspot import (
    do_discover,
    do_sync,
    setup,
)
from singer import catalog as catalog_singer
from typing import List


class Hubspot(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        setup(self.config, self.state)
        catalog = do_discover(return_streams=True)

        catalog_entries = []
        for stream in catalog['streams']:
            stream_id = stream['tap_stream_id']
            if not streams or stream_id in streams:
                schema = catalog_singer.Schema.from_dict(stream['schema'])
                catalog_entries.append(self.build_catalog_entry(stream_id, schema))

        return Catalog(catalog_entries)

    def sync(self, catalog: Catalog) -> None:
        _, state = setup(self.config, self.state)
        do_sync(state, catalog.to_dict())

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        return dict(
            companies=['property_hs_lastmodifieddate'],
            contact_lists=['updatedAt'],
            contacts=['versionTimestamp'],
            deals=['property_hs_lastmodifieddate'],
            email_events=['startTimestamp'],
            engagements=['lastUpdated'],
            entity_chunked=['startTimestamp'],
            forms=['updatedAt'],
            owners=['updatedAt'],
            subscription_changes=['startTimestamp'],
            workflows=['updatedAt'],
        ).get(stream_id, ['N/A'])

    def test_connection(self):
        pass


if __name__ == '__main__':
    main(Hubspot, schemas_folder='tap_hubspot/schemas')
