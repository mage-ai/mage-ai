from typing import List

from singer.schema import Schema

from mage_integrations.connections.dremio import Dremio as DremioConnection
from mage_integrations.sources.base import main
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_FORMAT_UUID,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
    REPLICATION_METHOD_FULL_TABLE,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.sources.dremio.utils import (
    mssql_column_type_mapping,
    mysql_column_type_mapping,
    postgres_column_type_mapping,
)
from mage_integrations.sources.sql.base import Source
from mage_integrations.sources.utils import get_standard_metadata
from mage_integrations.utils.dictionary import group_by


class Dremio(Source):
    def test_connection(self):
        test_query = "SELECT 1"
        flight_client = self.build_connection()
        flight_client.load(
            query_string=test_query
        )

    def build_connection(self) -> DremioConnection:
        return DremioConnection(**self.config)

    def build_discover_query(self, streams: List[str] = None):
        schema = self.config['schema']
        query = f"""
SELECT
    TABLE_NAME
    , COLUMN_DEFAULT
    , ORDINAL_POSITION
    , COLUMN_NAME
    , DATA_TYPE
    , IS_NULLABLE
FROM information_schema.columns
WHERE table_schema = '{schema}'
        """
        if streams:
            table_names = ', '.join([f"'{n}'" for n in streams])
            query = f'{query}\nAND TABLE_NAME IN ({table_names})'
        return query

    def column_type_mapping(self, column_type: str, column_format: str = None) -> str:
        if self.config.get('source_backend') == 'postgresql':
            return postgres_column_type_mapping(column_type,
                                                column_format)
        elif self.config.get('source_backend') == 'mysql':
            return mysql_column_type_mapping(column_type,
                                             column_format)
        elif self.config.get('source_backend') == 'mssql':
            return mssql_column_type_mapping(column_type,
                                             column_format)
        return super().column_type_mapping(column_type, column_format)

    def discover(self, streams: List[str] = None) -> Catalog:
        # Removed COLUMN_KEY parameter since
        # This info is not returned by Dremio INFORMATION_SCHEMA.COLUMNS
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
                column_name = self.__decode(column_data[3])
                column_type = self.__decode(column_data[4].lower())
                is_nullable = self.__decode(column_data[5])

                column_format = None
                column_properties = None
                column_types = []

                if 'YES' == is_nullable:
                    column_types.append(COLUMN_TYPE_NULL)

                if 'bool' in column_type:
                    column_types.append(COLUMN_TYPE_BOOLEAN)
                elif 'int' in column_type or 'bigint' in column_type:
                    column_types.append(COLUMN_TYPE_INTEGER)
                elif 'double' in column_type or 'float' in column_type or \
                        'numeric' in column_type or 'decimal' in column_type or \
                        'real' in column_type or 'number' in column_type:
                    column_types.append(COLUMN_TYPE_NUMBER)
                elif 'datetime' in column_type or 'timestamp' in column_type or \
                        'date' in column_type:
                    column_format = COLUMN_FORMAT_DATETIME
                    column_types.append(COLUMN_TYPE_STRING)
                elif 'json' in column_type or 'variant' in column_type:
                    column_properties = {}
                    column_types.append(COLUMN_TYPE_OBJECT)
                elif 'uuid' in column_type:
                    column_format = COLUMN_FORMAT_UUID
                    column_types.append(COLUMN_TYPE_STRING)
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
                valid_replication_keys=valid_replication_keys,
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

    def __decode(self, bytes_or_str):
        if type(bytes_or_str) is bytes:
            try:
                return bytes_or_str.decode('utf-8')
            except Exception:
                pass
        return bytes_or_str

    def build_table_name(self, stream) -> str:
        table_name = stream.tap_stream_id
        return f"{self.config['schema']}.{table_name}"


if __name__ == '__main__':
    main(Dremio)
