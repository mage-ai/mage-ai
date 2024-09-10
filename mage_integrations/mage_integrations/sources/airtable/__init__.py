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

    def build_api(self):
        connection = AirtableConnection(self.config['token'])
        api = connection.build_connection()
        return api

    def discover(self, streams: List[str] = None) -> Catalog:
        api = self.build_api()
        tables = []
        if self.base_id:
            base = api.base(self.base_id)
            for table in base.tables():
                tables.append(table)
        elif self.table_name:
            table = api.table(self.base_id, self.table_name)
            tables.append(table)
        else:
            for base in api.bases():
                for table in base.tables():
                    tables.append(table)

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
        api = self.build_api()
        api.bases()


if __name__ == '__main__':
    main(Airtable)
