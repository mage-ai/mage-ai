import os

import aiofiles
import yaml

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.block.content import template_render
from mage_ai.io.base import DataSource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.settings.repo import get_repo_path

DATA_PROVIDERS = [
    DataSource.BIGQUERY,
    DataSource.CHROMA,
    DataSource.CLICKHOUSE,
    DataSource.DRUID,
    DataSource.DUCKDB,
    DataSource.MSSQL,
    DataSource.MYSQL,
    DataSource.POSTGRES,
    DataSource.REDSHIFT,
    DataSource.SNOWFLAKE,
    DataSource.SPARK,
    DataSource.TRINO,
]
DATA_PROVIDERS_NAME = {
    DataSource.BIGQUERY: 'BigQuery',
    DataSource.CHROMA: 'Chroma',
    DataSource.CLICKHOUSE: 'ClickHouse',
    DataSource.DUCKDB: 'DuckDB',
    DataSource.DRUID: 'Druid',
    DataSource.MSSQL: 'Microsoft SQL Server',
    DataSource.MYSQL: 'MySQL',
    DataSource.POSTGRES: 'PostgreSQL',
    DataSource.REDSHIFT: 'Redshift',
    DataSource.SNOWFLAKE: 'Snowflake',
    DataSource.SPARK: 'Spark',
    DataSource.TRINO: 'Trino',
}


class DataProviderResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        file_path = f'{get_repo_path(user=user)}/io_config.yaml'
        profiles = []
        if os.path.exists(file_path):
            async with aiofiles.open(file_path, mode='r') as file:
                content = await file.read()
                profiles = list(yaml.safe_load(template_render(content)).keys()) if content else []

        collection = [dict(
            id=DATA_PROVIDERS_NAME[ds.value],
            profiles=[p for p in profiles if p != 'version'],
            value=ds.value,
        ) for ds in DATA_PROVIDERS]

        return self.build_result_set(
            collection,
            user,
            **kwargs,
        )
