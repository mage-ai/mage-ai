from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.pipedrive.tap_pipedrive.tap import PipedriveTap
from mage_integrations.utils.dictionary import ignore_keys
from singer import catalog as catalog_singer
from typing import List


class Pipedrive(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        pipedrive_tap = PipedriveTap(self.config,
                                     self.state)

        catalog = pipedrive_tap.do_discover().to_dict()

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

    def sync(self, catalog) -> None:

        pipedrive_tap = PipedriveTap(self.config,
                                     self.state)
        pipedrive_tap.do_sync(catalog)


if __name__ == '__main__':
    main(Pipedrive, schemas_folder='tap_pipedrive/schemas')
