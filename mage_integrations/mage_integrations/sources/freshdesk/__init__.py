from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.freshdesk.tap_freshdesk import (
    do_sync,
    update_config,
    update_state,
)
from typing import List


class Freshdesk(Source):
    def get_table_key_properties(self, stream_id: str) -> List[str]:
        return ['id']

    def get_valid_replication_keys(self, stream_id: str) -> List[str]:
        return ['updated_at']

    def sync(self, catalog: Catalog) -> None:
        update_config(self.config)
        update_state(self.state)
        do_sync(catalog.to_dict())


if __name__ == '__main__':
    main(Freshdesk, schemas_folder='tap_freshdesk/schemas')
