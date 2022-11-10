from mage_integrations.connections.postgresql import PostgreSQL as PostgreSQLConnection
from mage_integrations.sources.base import main
from mage_integrations.sources.sql.base import Source
from typing import List


class PostgreSQL(Source):
    @property
    def table_prefix(self):
        schema = self.config['schema']
        return f'{schema}.'

    def build_connection(self) -> PostgreSQLConnection:
        return PostgreSQLConnection(
            database=self.config['database'],
            host=self.config['host'],
            password=self.config['password'],
            port=self.config.get('port'),
            username=self.config['username'],
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

    def update_column_names(self, columns: List[str]) -> List[str]:
        return list(map(lambda column: f'"{column}"', columns))

if __name__ == '__main__':
    main(PostgreSQL)
