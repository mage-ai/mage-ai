from datetime import datetime
from typing import Dict, Generator, List

from mage_integrations.connections.airtable import Airtable as AirtableConnection
from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog


class Airtable(Source):
    @property
    def base_id(self):
        return self.config.get('base_id')

    @property
    def table_name(self):
        return self.config.get('table_name')

    def build_client(self):
        connection = AirtableConnection(self.config['token'])
        api = connection.build_connection()
        if self.base_id:
            return api.base(self.base_id)
        elif self.table_name:
            if not self.base_id:
                raise ValueError('No base_id')
            return api.table(self.base_id, self.table_name)
        else:
            return api

    def discover(self, streams: List[str] = None) -> Catalog:
        pass

    def discover_streams(self) -> List[Dict]:
        pass

    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = None,
        sample_data: bool = False,
        start_date: datetime = None,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        pass

    def test_connection(self) -> None:
        pass


if __name__ == '__main__':
    main(Airtable)
