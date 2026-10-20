from typing import List

from singer import catalog as catalog_singer

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.sftp.tap_sftp.client import SFTPConnection
from mage_integrations.sources.sftp.tap_sftp.tap import do_discover, do_sync


class SFTP(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        catalog = do_discover(self.config, self.logger)

        catalog_entries = []
        for stream in catalog['streams']:
            stream_id = stream['tap_stream_id']
            if not streams or stream_id in streams:
                schema = catalog_singer.Schema.from_dict(stream['schema'])
                catalog_entries.append(self.build_catalog_entry(stream_id,
                                                                schema))

        return Catalog(catalog_entries)

    def sync(self, catalog: Catalog) -> None:
        do_sync(self.config, catalog, self.state or {}, self.logger)

    def test_connection(self) -> None:
        client = SFTPConnection(host=self.config['host'],
                                username=self.config['username'],
                                password=self.config['password'],
                                private_key_file=self.config.get(
                                    'private_key_file'),
                                port=self.config['port'])
        client.close()


if __name__ == '__main__':
    main(SFTP)
