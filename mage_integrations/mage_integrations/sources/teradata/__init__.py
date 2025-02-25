from typing import List

import dateutil
from singer.schema import Schema

from mage_integrations.connections.teradata import Teradata as TeradataConnection
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
from mage_integrations.sources.sql.base import Source
from mage_integrations.sources.utils import get_standard_metadata
from mage_integrations.utils.dictionary import group_by

# https://docs.teradata.com/r/Enterprise_IntelliFlex_VMware/Data-Dictionary/Views-Reference/ColumnsV-X/Usage-Notes
COLUMN_TYPE_MAPPING = {
    '++': None,  # TD_ANYTYPE
    'A1': 'ARRAY',
    'AN': 'ARRAY',
    'AT': 'TIME',
    'BF': 'BINARY',
    'BO': 'BLOB',
    'BV': 'VARBINARY',
    'CF': 'CHAR',
    'CO': 'CLOB',
    'CV': 'VARCHAR',
    'D': 'DECIMAL',
    'DA': 'DATE',
    'DH': 'INTERVAL DAY TO HOUR',
    'DM': 'INTERVAL DAY TO MINUTE',
    'DS': 'INTERVAL DAY TO SECOND',
    'DT': None,
    'DY': 'INTERVAL DAY',
    'F': 'FLOAT',
    'HM': 'INTERVAL HOUR TO MINUTE',
    'HR': 'INTERVAL HOUR',
    'HS': 'INTERVAL HOUR TO SECOND',
    'I1': 'TINYINT',
    'I2': 'SMALLINT',
    'I8': 'BIGINT',
    'I': 'INTEGER',
    'JN': 'JSON',
    'LF': 'CHAR',
    'LV': 'VARCHAR',
    'MI': 'INTERVAL MINUTE',
    'MO': 'INTERVAL MONTH',
    'MS': 'INTERVAL MINUTE TO SECOND',
    'N': 'DECIMAL',
    'PD': 'PERIOD(DATE)',
    'PM': 'TIMESTAMP WITH TIME ZONE',
    'PS': 'TIMESTAMP',
    'PT': 'TIME',
    'PZ': 'TIME WITH TIME ZONE',
    'SC': 'INTERVAL SECOND',
    'SZ': 'TIMESTAMP WITH TIME ZONE',
    'TS': 'TIMESTAMP',
    'TZ': 'TIME WITH TIME ZONE',
    'UF': 'NCHAR',
    'UT': 'UDT',  # Custom mapping required for user-defined types
    'UV': 'NVARCHAR',
    'VA': None,
    'XM': 'XML',
    'YM': 'INTERVAL YEAR TO MONTH',
    'YR': 'INTERVAL YEAR'
}


class Teradata(Source):
    def build_table_name(self, stream) -> str:
        table_name = stream.tap_stream_id

        return f'{self.table_prefix}"{table_name}"'

    def build_connection(self) -> TeradataConnection:
        return TeradataConnection(
            database=self.config['database'],
            host=self.config['host'],
            password=self.config['password'],
            port=self.config.get('port', 1025),
            username=self.config['username'],
            verbose=0 if self.discover_mode or self.discover_streams_mode else 1,
        )

    def build_discover_query(self, streams: List[str] = None):
        database = self.config['database']
        query = f"""
SELECT
    c.TableName AS TABLE_NAME,
    c.DefaultValue AS COLUMN_DEFAULT,
    NULL AS COLUMN_KEY,
    c.ColumnName AS COLUMN_NAME,
    c.ColumnType AS COLUMN_TYPE,
    CASE c.Nullable
         WHEN 'Y' THEN 'YES'
         ELSE 'NO'
    END AS IS_NULLABLE
FROM DBC.ColumnsV c
JOIN DBC.TablesV t
  ON c.DatabaseName = t.DatabaseName
  AND c.TableName = t.TableName
WHERE c.DatabaseName = '{database}'
AND t.TableKind <> 'P'
        """

        if streams:
            table_names = ', '.join([f"'{n}'" for n in streams])
            query = f'{query}\nAND c.TableName IN ({table_names})'
        return query

    def convert_datetime(self, val):
        if val is None:
            return val
        parts = val.split('.')
        arr = parts
        if len(parts) >= 2:
            arr = parts[:-1]
            tz = parts[-1][:3]
            arr.append(tz)
            final_value = '.'.join(arr)
        else:
            final_value = dateutil.parser.parse(val).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]
        return final_value

    def column_type_mapping(self, column_type: str, column_format: str = None) -> str:
        if COLUMN_FORMAT_DATETIME == column_format:
            return 'TIMESTAMP'
        return super().column_type_mapping(column_type, column_format)

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
                column_key = column_data[2]
                column_name = column_data[3]
                column_type = column_data[4]
                if column_type is not None:
                    column_type = COLUMN_TYPE_MAPPING.get(column_type.strip())
                if column_type is not None:
                    column_type = column_type.lower()
                else:
                    column_type = 'varchar'
                is_nullable = column_data[5]

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
                # TODO: when adding array column type, we also need to add the setting
                # for items and the item properties and types.
                # See Stripe’s balance_transactions.json schema for an example.
                # elif 'array' in column_type:
                #     column_types.append(COLUMN_TYPE_ARRAY)
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

    def update_column_names(self, columns: List[str]) -> List[str]:
        return list(map(lambda column: f'"{column}"', columns))

    def _limit_query_string(self, limit, offset, order_by_columns: List = None):
        if not order_by_columns:
            raise Exception('Require the order by columns to construct the query string.')
        return f'QUALIFY ROW_NUMBER() OVER (ORDER BY {", ".join(order_by_columns)}) '\
               f'BETWEEN {offset+1} AND {offset+limit};'

    def _order_by_query_string(self, order_by_columns):
        return ''


if __name__ == '__main__':
    main(Teradata)
