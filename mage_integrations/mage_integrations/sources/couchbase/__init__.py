from enum import Enum
from mage_integrations.connections.couchbase import (
    Couchbase as CouchbaseConnection
)
from mage_integrations.sources.base import main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.constants import (
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
)
from mage_integrations.sources.couchbase.utils import (
    build_comparison_statement,
    wrap_column_in_quotes,
)
from mage_integrations.sources.sql.base import Source
from singer import catalog
from typing import Any, Dict, List

DEFAULT_COLUMN_NAME = '_document'


class SchemaStrategy(str, Enum):
    INFER = 'infer'
    COMBINE = 'combine'


class Couchbase(Source):
    def build_connection(self) -> CouchbaseConnection:
        return CouchbaseConnection(
            bucket=self.config['bucket'],
            scope=self.config['scope'],
            connection_string=self.config['connection_string'],
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
INFER `{stream_id}`
WITH {{"sample_size": 1000, "similarity_metric": 0.4, "dictionary_threshold": 3}}
            """

            infer_result = connection.load(infer_query)[0]
            
            def get_infer_result_doc_count(result):
                props = result.get('properties', {})
                doc_count = props.get('#docs', 0)
                if type(doc_count) is list:
                    doc_count = sum(doc_count)
                return doc_count
            
            strategy = self.config.get('strategy')
            if strategy == SchemaStrategy.INFER or \
                    (strategy is None and len(infer_result) == 1):
                result = max(infer_result, key=get_infer_result_doc_count)
                try:
                    props = result.get('properties', {})
                    for column, data in props.items():
                        dtype = data.get('type')
                        if type(dtype) is not list:
                            if dtype == COLUMN_TYPE_NULL:
                                dtype = [COLUMN_TYPE_NULL, COLUMN_TYPE_STRING]
                            else:
                                dtype = [COLUMN_TYPE_NULL, dtype]
                        prop = dict(type=[self.__get_type(t) for t in dtype])
                        properties[column] = prop
                except Exception:
                    pass
            else:
                properties[DEFAULT_COLUMN_NAME] = \
                    dict(
                        type=[COLUMN_TYPE_NULL, COLUMN_TYPE_OBJECT],
                        additionalProperties=True
                    )

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

    def _build_comparison_statement(
        self,
        col: str,
        val: Any,
        properties: Dict,
        operator: str = '=',
    ) -> str:
        return build_comparison_statement(
            col,
            val,
            properties,
            operator=operator,
            column_cleaned=wrap_column_in_quotes(col),
            convert_datetime_func=self.convert_datetime,
        )

    def update_column_names(self, columns):
        if len(columns) == 1 and columns[0] == DEFAULT_COLUMN_NAME:
            return ['*']
        return columns

    def _convert_to_rows(self, columns, rows_temp):
        rows = []
        if len(columns) == 1 and columns[0] == DEFAULT_COLUMN_NAME:
            for row in rows_temp:
                # When using the * syntax, Couchbase returns the records
                # in the form {"stream_id": { fields }}
                values = list(row.values())[0]
                rows.append({DEFAULT_COLUMN_NAME: values})
        else:
            rows = rows_temp
        return rows

    def test_connection(self):
        self.build_connection().get_bucket()


if __name__ == '__main__':
    main(Couchbase)
