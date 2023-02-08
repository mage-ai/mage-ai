from mage_integrations.connections.couchbase import Couchbase as CouchbaseConnection
from mage_integrations.sources.base import main
from mage_integrations.sources.constants import (
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
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
        collection_manager = connection.get_bucket().collections()

        scopes = collection_manager.get_all_scopes()
        collection_names = []
        for scope in scopes:
            if scope.name == self.config['scope']:
                collection_names = [c.name for c in scope.collections]

        catalog_entries = []
        scope = connection.get_scope()
        for stream_id in collection_names:
            properties = dict()
            
            infer_query = f"""
INFER `{stream_id}`
WITH {{"sample_size": 1000, "similarity_metric": 0, "dictionary_threshold": 0}}
            """

            infer_result = scope.query(infer_query)
            result = next(infer_result.rows())
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

    def __get_type(self, type) -> str:
        column_type = COLUMN_TYPE_STRING
        if type == 'number':
            column_type = COLUMN_TYPE_NUMBER
        elif type == 'boolean':
            column_type = COLUMN_TYPE_BOOLEAN
        elif type == 'string':
            column_type = COLUMN_TYPE_STRING
        elif type in ['missing', 'null']:
            column_type = COLUMN_TYPE_NULL
        
        return column_type

    def _convert_to_rows(self, columns, rows_temp):
        return rows_temp

    def test_connection(self):
        self.build_connection().get_bucket()

if __name__ == '__main__':
    main(Couchbase)
