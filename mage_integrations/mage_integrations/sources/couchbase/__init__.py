from mage_integrations.connections.couchbase import Couchbase as CouchbaseConnection
from mage_integrations.sources.base import main
from mage_integrations.sources.constants import (
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING
)
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.sql.base import Source
from singer import catalog
from typing import List

class Couchbase(Source):
    def build_connection(self) -> CouchbaseConnection:
        return CouchbaseConnection(
            bucket=self.config['bucket'],
            scope=self.config['scope'],
            host=self.config['host'],
            password=self.config['password'],
            username=self.config['username']
        )

    def discover(self, streams: List[str] = None) -> Catalog:
        connection = self.build_connection()
        collection_names = connection.get_all_collections()

        catalog_entries = []
        for stream_id in collection_names:
            properties = dict()
            
            infer_query = f"""
INFER `route`
WITH {{"sample_size": 1000, "similarity_metric": 0, "dictionary_threshold": 0}}
            """

            infer_result = connection.load(infer_query)
            result = next(iter(infer_result))
            try:
                props = result[0]['properties'] or dict()
                for column, data in props.items():
                    dtype = data.get('type')
                    if type(dtype) is not list:
                        dtype = [COLUMN_TYPE_NULL, dtype]
                    dtype = set(dtype)
                    prop = dict(type=[self.__get_type(t) for t in dtype])
                    properties[column] = prop
            except Exception:
                pass

            schema = catalog.Schema.from_dict(dict(
                properties=properties,
                type='object',
            ))
            catalog_entries.append(self.build_catalog_entry(
                stream_id,
                schema
            ))

        return Catalog(catalog_entries)

    def __get_type(self, dtype: str) -> str:
        column_type = dtype
        if dtype == 'missing':
            column_type = COLUMN_TYPE_STRING
        
        return column_type

    def _convert_to_rows(self, columns, rows_temp):
        return rows_temp

    def test_connection(self):
        self.build_connection().get_bucket()

if __name__ == '__main__':
    main(Couchbase)
