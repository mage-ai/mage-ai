from typing import List

from singer import catalog as catalog_singer
from zenpy import Zenpy

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.zendesk.tap_zendesk import (
    api_token_auth,
    do_discover,
    do_sync,
    get_session,
    oauth_auth,
)
from mage_integrations.sources.zendesk.tap_zendesk.streams import STREAMS


class Zendesk(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        creds = oauth_auth(self.config, logger=self.logger) or api_token_auth(
                                                                self.config, logger=self.logger)
        session = get_session(self.config)
        client = Zenpy(session=session, **creds)

        catalog = do_discover(client, logger=self.logger)

        catalog_entries = []
        for stream in catalog['streams']:
            stream_id = stream['tap_stream_id']
            if not streams or stream_id in streams:
                schema = catalog_singer.Schema.from_dict(stream['schema'])
                catalog_entries.append(self.build_catalog_entry(stream_id, schema))

        return Catalog(catalog_entries)

    def sync(self, catalog: Catalog) -> None:
        creds = oauth_auth(self.config, logger=self.logger) or api_token_auth(
                                                                self.config, logger=self.logger)
        session = get_session(self.config)
        client = Zenpy(session=session, **creds)

        do_sync(client, catalog, self.state or {},
                self.config, logger=self.logger)

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        value = STREAMS[stream_id].replication_key
        if type(value) is not list:
            value = [value]

        return value

    def test_connection(self):
        creds = oauth_auth(self.config, logger=self.logger) or api_token_auth(
                                                                self.config, logger=self.logger)
        session = get_session(self.config)
        client = Zenpy(session=session, **creds)
        client.users()


if __name__ == '__main__':
    main(Zendesk, schemas_folder='tap_zendesk/schemas')
