from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.zendesk.tap_zendesk import (
    build_client,
    do_discover,
    do_sync,
)
from mage_integrations.sources.zendesk.tap_zendesk.streams import STREAMS
from singer import catalog as catalog_singer
from typing import List


class Zendesk(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        client = build_client(self.config)
        catalog = do_discover(client, self.config, return_streams=True, selected_streams=streams)

        catalog_entries = []
        for stream in catalog['streams']:
            stream_id = stream['tap_stream_id']
            if not streams or stream_id in streams:
                schema = catalog_singer.Schema.from_dict(stream['schema'])
                catalog_entries.append(self.build_catalog_entry(stream_id, schema))

        return Catalog(catalog_entries)

    def sync(self, catalog: Catalog) -> None:
        client = build_client(self.config)
        do_sync(client, catalog, self.state or {}, self.config)

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        value = STREAMS[stream_id].replication_key
        if type(value) is not list:
            value = [value]

        return value

    def test_connection(self):
        client = build_client(self.config)
        stream = STREAMS['tickets'](client, self.config)
        stream.check_access()


if __name__ == '__main__':
    main(Zendesk, schemas_folder='tap_zendesk/schemas')
