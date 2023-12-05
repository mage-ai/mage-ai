from typing import List

from mage_integrations.connections.bigquery import BigQuery as BigQueryConnection
from mage_integrations.sources.base import main
from mage_integrations.sources.constants import COLUMN_FORMAT_DATETIME
from mage_integrations.sources.sql.base import Source


class BigQuery(Source):
    @property
    def table_prefix(self) -> str:
        dataset = self.config['dataset']
        return f'{dataset}.'

    def build_connection(self) -> BigQueryConnection:
        return BigQueryConnection(
            credentials_info=self.config.get('credentials_info'),
            path_to_credentials_json_file=self.config.get('path_to_credentials_json_file'),
        )

    def build_discover_query(self, streams: List[str] = None) -> str:
        dataset = self.config['dataset']
        query = f"""
SELECT
    table_name
    , column_default
    , NULL AS column_key
    , column_name
    , data_type
    , is_nullable
FROM {dataset}.INFORMATION_SCHEMA.COLUMNS
        """

        if streams:
            table_names = ', '.join([f"'{n}'" for n in streams])
            query += f'\nWHERE TABLE_NAME IN ({table_names})'
        return query

    def column_type_mapping(self, column_type: str, column_format: str = None) -> str:
        if COLUMN_FORMAT_DATETIME == column_format:
            # Not cast datetime value type when comparing bookmark values
            return None
        return super().column_type_mapping(column_type, column_format)

    def update_column_names(self, columns: List[str]) -> List[str]:
        return [f'`{column}`' for column in columns]

    def wrap_column_in_quotes(self, column: str) -> str:
        if "`" not in column:
            return f'`{column}`'

        return column


if __name__ == '__main__':
    main(BigQuery)
