from typing import List

from mage_integrations.connections.snowflake import Snowflake as SnowflakeConnection
from mage_integrations.sources.base import main
from mage_integrations.sources.sql.base import Source


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
            role=self.config.get('role'),
        )

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
