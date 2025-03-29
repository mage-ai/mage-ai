from typing import List

import dateutil

from mage_integrations.connections.mssql import MSSQL as MSSQLConnection
from mage_integrations.sources.base import main
from mage_integrations.sources.constants import COLUMN_FORMAT_DATETIME
from mage_integrations.sources.sql.base import Source


class MSSQL(Source):
    @property
    def table_prefix(self):
        schema = self.config['schema']
        return f'"{schema}".'

    def build_table_name(self, stream) -> str:
        table_name = stream.tap_stream_id

        return f'{self.table_prefix}"{table_name}"'

    def build_connection(self) -> MSSQLConnection:
        return MSSQLConnection(
            authentication=self.config.get('authentication'),
            database=self.config['database'],
            driver=self.config.get('driver'),
            host=self.config['host'],
            password=self.config['password'],
            port=self.config.get('port', 1433),
            username=self.config['username'],
            verbose=0 if self.discover_mode or self.discover_streams_mode else 1,
        )

    def build_discover_query(self, streams: List[str] = None):
        schema = self.config['schema']

        query = f"""
SELECT
    c.table_name
    , c.column_default
    , tc.constraint_type AS column_key
    , c.column_name
    , c.data_type
    , c.is_nullable
FROM information_schema.columns c
LEFT JOIN information_schema.constraint_column_usage AS ccu
ON c.column_name = ccu.column_name
    AND c.table_name = ccu.table_name
    AND c.table_schema = ccu.table_schema
LEFT JOIN information_schema.table_constraints AS tc
ON tc.constraint_schema = ccu.constraint_schema
    AND tc.constraint_name = ccu.constraint_name
WHERE  c.table_schema = '{schema}'
        """

        if streams:
            table_names = ', '.join([f"'{n}'" for n in streams])
            query = f'{query}\nAND c.TABLE_NAME IN ({table_names})'
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
            return 'DATETIME'
        return super().column_type_mapping(column_type, column_format)

    def update_column_names(self, columns: List[str]) -> List[str]:
        return list(map(lambda column: f'"{column}"', columns))

    def _limit_query_string(self, limit, offset, **kwargs):
        return f'OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY'


if __name__ == '__main__':
    main(MSSQL)
