import aiofiles
import yaml

from mage_ai.api.resources.GenericResource import GenericResource
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
        async with aiofiles.open(f'{get_repo_path()}/io_config.yaml', mode='r') as file:
            profiles = list(yaml.safe_load(await file.read()).keys())

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
