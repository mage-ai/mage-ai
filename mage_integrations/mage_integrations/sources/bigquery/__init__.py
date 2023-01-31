from mage_integrations.connections.bigquery import BigQuery as BigQueryConnection
from mage_integrations.sources.base import main
from mage_integrations.sources.sql.base import Source
from typing import List


class BigQuery(Source):
    @property
    def table_prefix(self) -> str:
        dataset = self.config['dataset']
        return f'{dataset}.'

    def build_connection(self) -> BigQueryConnection:
        return BigQueryConnection(
            path_to_credentials_json_file=self.config['path_to_credentials_json_file'],
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

    def update_column_names(self, columns: List[str]) -> List[str]:
        return [f'`{column}`' for column in columns]


if __name__ == '__main__':
    main(BigQuery)
