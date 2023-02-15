import singer
from singer import catalog as catalog_singer
import json, sys

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.pipedrive.tap_pipedrive import PipedriveTap
from mage_integrations.utils.dictionary import ignore_keys
from mage_integrations.sources.constants import (
    REPLICATION_METHOD_FULL_TABLE)


from typing import List


class Pipedrive(Source):
    def discover(self, streams: List[str] = None) -> Catalog:

        

        pipedrive_tap = PipedriveTap(json.loads(json.dumps(self.config)), self.state)
        

        catalog = pipedrive_tap.do_discover()
  
        return catalog
        

    def sync(self, catalog) -> None:
        
        pipedrive_tap = PipedriveTap(json.loads(json.dumps(self.config)), self.state)
        pipedrive_tap.do_sync(catalog)

    def test_connection(self):
        pass

    def get_forced_replication_method(self, stream_id: str) -> str:
        return REPLICATION_METHOD_FULL_TABLE

if __name__ == '__main__':
    main(Pipedrive, schemas_folder='tap_pipedrive/schemas')
