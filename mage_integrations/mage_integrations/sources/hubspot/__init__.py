from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.hubspot.tap_hubspot import (
    do_discover,
    do_sync,
    setup,
)
from mage_integrations.sources.hubspot.tap_hubspot.constants import BOOKMARK_PROPERTIES_BY_STREAM_NAME
from mage_integrations.utils.dictionary import ignore_keys
from singer import catalog as catalog_singer
from typing import List


class Hubspot(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        setup(self.config, self.state)
        catalog = do_discover(return_streams=True, logger=self.logger)

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
        _, state = setup(self.config, self.state)
        do_sync(state, catalog.to_dict(), logger=self.logger)

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        return BOOKMARK_PROPERTIES_BY_STREAM_NAME.get(stream_id, ['N/A'])


if __name__ == '__main__':
    main(Hubspot, schemas_folder='tap_hubspot/schemas')
