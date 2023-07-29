from mage_integrations.connections.snowflake import Snowflake as SnowflakeConnection
from mage_integrations.sources.base import main
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_FORMAT_UUID,
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_FLOAT,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
    REPLICATION_METHOD_FULL_TABLE,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.sources.sql.base import Source
from mage_integrations.sources.utils import get_standard_metadata
from mage_integrations.utils.dictionary import group_by
from singer.schema import Schema
from typing import List


class Snowflake(Source):
    """
    Data types: https://docs.snowflake.com/en/sql-reference/intro-summary-data-types
    """

    @property
    def table_prefix(self):
        database_name = self.config['database']
        schema_name = self.config['schema']
        return f'"{database_name}"."{schema_name}".'

    def build_connection(self) -> SnowflakeConnection:
        return SnowflakeConnection(
            account=self.config['account'],
            database=self.config['database'],
            password=self.config['password'],
            schema=self.config['schema'],
            username=self.config['username'],
            warehouse=self.config['warehouse'],
        )

    def discover(self, streams: List[str] = None) -> Catalog:
        query = self.build_discover_query(streams=streams)

        rows = self.build_connection().load(query)
        groups = group_by(lambda t: t[0], rows)

        streams = []
        for stream_id, columns_data in groups.items():
            properties = dict()
            unique_constraints = []
            valid_replication_keys = []

            for column_data in columns_data:
                """
                Each column data has the following values
                * TABLE_NAME
                * COLUMN_DEFAULT
                * COLUMN_KEY
                * COLUMN_NAME
                * DATA_TYPE
                * IS_NULLABLE
                """
                column_key = self.__decode(column_data[2])
                column_name = self.__decode(column_data[3])
                column_type = self.__decode(column_data[4].lower())
                is_nullable = self.__decode(column_data[5])

                column_format = None
                column_properties = None
                column_types = []

                if column_key is not None and ('PRI' in column_key or 'UNIQUE' == column_key):
                    unique_constraints.append(column_name)

                if 'YES' == is_nullable:
                    column_types.append(COLUMN_TYPE_NULL)

                if 'bool' in column_type:
                    column_types.append(COLUMN_TYPE_BOOLEAN)
                elif 'int' in column_type or 'bigint' in column_type:
                    column_types.append(COLUMN_TYPE_INTEGER)
                elif 'double' in column_type or 'float' in column_type or \
                        'real' in column_type:
                    column_types.append(COLUMN_TYPE_FLOAT)
                elif 'numeric' in column_type or 'decimal' in column_type or \
                        'number' in column_type:
                    column_types.append(COLUMN_TYPE_NUMBER)
                elif 'datetime' in column_type or 'timestamp' in column_type or \
                        'date' in column_type:
                    column_format = COLUMN_FORMAT_DATETIME
                    column_types.append(COLUMN_TYPE_STRING)
                    valid_replication_keys.append(column_name)
                elif 'object' in column_type:
                    column_properties = {}
                    column_types.append(COLUMN_TYPE_OBJECT)
                elif 'json' in column_type or 'variant' in column_type:
                    column_properties = {}
                    column_types.append(COLUMN_TYPE_OBJECT)
                elif 'uuid' in column_type:
                    column_format = COLUMN_FORMAT_UUID
                    column_types.append(COLUMN_TYPE_STRING)
                elif 'array' in column_type:
                    column_types.append(COLUMN_TYPE_ARRAY)
                else:
                    # binary, text, varchar, character varying
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

    def build_discover_query(self, streams: List[str] = None) -> str:
        database = self.config['database']
        schema = self.config['schema']

        query = f"""
SELECT
    TABLE_NAME
    , COLUMN_DEFAULT
    , NULL AS COLUMN_KEY
    , COLUMN_NAME
    , DATA_TYPE
    , IS_NULLABLE
FROM "{database}".INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = '{schema}'
        """

        if streams:
            table_names = ', '.join([f"'{n}'" for n in streams])
            query += f'\nAND TABLE_NAME IN ({table_names})'
        return query

    def build_table_name(self, stream) -> str:
        table_name = stream.tap_stream_id

        return f'{self.table_prefix}"{table_name}"'

    def update_column_names(self, columns: List[str]) -> List[str]:
        return list(map(lambda column: f'"{column}"', columns))


if __name__ == '__main__':
    main(Snowflake)
