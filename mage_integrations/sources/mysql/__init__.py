from datetime import datetime
from mage_integrations.connections.mysql import MySQL as MySQLConnection
from mage_integrations.sources.mysql.utils import build_comparison_statement
from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    BATCH_FETCH_LIMIT,
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
    REPLICATION_METHOD_FULL_TABLE,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.sources.utils import get_standard_metadata
from mage_integrations.utils.dictionary import group_by
from mage_integrations.utils.schema_helpers import extract_selected_columns
from singer.schema import Schema
from typing import Dict, List


class MySQL(Source):
    def build_connection(self) -> MySQLConnection:
        return MySQLConnection(
            database=self.config['database'],
            host=self.config['host'],
            password=self.config['password'],
            port=self.config.get('port'),
            username=self.config['username'],
        )

    def discover(self, streams: List[str] = None) -> Catalog:
        database = self.config['database']

        query = f"""
SELECT
    TABLE_NAME
    , COLUMN_DEFAULT
    , COLUMN_KEY
    , COLUMN_NAME
    , COLUMN_TYPE
    , EXTRA
    , IS_NULLABLE
FROM information_schema.columns
WHERE table_schema = '{database}'
        """
        if streams:
            table_names = ', '.join([f"'{n}'" for n in streams])
            query = f'{query}\nAND TABLE_NAME IN ({table_names})'

        rows = self.build_connection().load(query)
        groups = group_by(lambda t: t[0], rows)

        streams = []
        for stream_id, columns_data in groups.items():
            properties = dict()
            unique_constraints = []
            valid_replication_keys = []

            for column_data in columns_data:
                column_key = column_data[2]
                column_name = column_data[3]
                column_type = column_data[4]
                is_nullable = column_data[6]

                column_format = None
                column_properties = None
                column_types = []

                if 'PRI' == column_key:
                    unique_constraints.append(column_name)

                if 'YES' == is_nullable:
                    column_types.append(COLUMN_TYPE_NULL)

                if 'bool' in column_type:
                    column_types.append(COLUMN_TYPE_BOOLEAN)
                elif 'int' in column_type:
                    column_types.append(COLUMN_TYPE_INTEGER)
                elif 'double' in column_type or 'float' in column_type:
                    column_types.append(COLUMN_TYPE_NUMBER)
                elif 'datetime' in column_type:
                    column_format = COLUMN_FORMAT_DATETIME
                    column_types.append(COLUMN_TYPE_STRING)
                    valid_replication_keys.append(column_name)
                elif 'json' in column_type:
                    column_properties = {}
                    column_types.append(COLUMN_TYPE_OBJECT)
                else:
                    # binary, text, varchar
                    column_types.append(COLUMN_TYPE_STRING)

                properties[column_name] = dict(
                    properties=column_properties,
                    format=column_format,
                    type=column_types,
                )

            schema = Schema.from_dict(dict(
                properties=properties,
                type='object',
            ))
            metadata = get_standard_metadata(
                key_properties=unique_constraints,
                replication_method=REPLICATION_METHOD_FULL_TABLE,
                schema=schema.to_dict(),
                stream_id=stream_id,
                valid_replication_keys=unique_constraints + valid_replication_keys,
            )
            catalog_entry = CatalogEntry(
                key_properties=unique_constraints,
                metadata=metadata,
                replication_method=REPLICATION_METHOD_FULL_TABLE,
                schema=schema,
                stream=stream_id,
                tap_stream_id=stream_id,
                unique_conflict_method=UNIQUE_CONFLICT_METHOD_UPDATE,
                unique_constraints=unique_constraints,
            )

            streams.append(catalog_entry)

        return Catalog(streams)

    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = {},
        **kwargs,
    ) -> List[Dict]:
        table_name = stream.tap_stream_id

        key_properties = stream.key_properties
        unique_constraints = stream.unique_constraints
        bookmark_properties = list(bookmarks.keys() if bookmarks else [])

        rows = []
        rows_temp = None
        loops = 0

        while rows_temp is None or len(rows_temp) >= 1:
            row_number_statement = 'ROW_NUMBER()'
            order_by_columns = set()
            if key_properties:
                order_by_columns.update(key_properties)
            if unique_constraints:
                order_by_columns.update(unique_constraints)
            if bookmark_properties:
                order_by_columns.update(bookmark_properties)
            order_by_columns = list(order_by_columns)

            if order_by_columns:
                over_statement = f"ORDER BY {', '.join(order_by_columns)}"
                row_number_statement = f'{row_number_statement} OVER ({over_statement})'

            columns = extract_selected_columns(stream.metadata)
            columns_statement = '\n, '.join(columns)
            query_string = f"""
SELECT
    {columns_statement}
    , {row_number_statement} AS rnum
FROM {table_name}"""
            where_statements = []
            if bookmarks:
                for col, val in bookmarks.items():
                    where_statements.append(
                        build_comparison_statement(
                            col,
                            val,
                            stream.schema.to_dict()['properties'],
                            operator='>',
                        ),
                    )

            if query:
                for col, val in query.items():
                    if col in columns:
                        where_statements.append(build_comparison_statement(col, val, stream.schema.to_dict()['properties']))

            if where_statements:
                where_statement = ' AND '.join(where_statements)
                query_string = f"{query_string}\nWHERE {where_statement}"

            with_limit_query_string = f"""
WITH rows_with_limit AS (
{query_string}
)

SELECT
    {columns_statement}
    , rnum
FROM rows_with_limit
WHERE rnum >= {1 + (BATCH_FETCH_LIMIT * loops)} AND rnum <= {(BATCH_FETCH_LIMIT * (loops + 1))}"""

            rows_temp = self.build_connection().load(with_limit_query_string)
            loops += 1
            rows += rows_temp

            if len(rows_temp) < BATCH_FETCH_LIMIT:
                break

        return [{col: row[idx] for idx, col in enumerate(columns)} for row in rows]


if __name__ == '__main__':
    main(MySQL)
