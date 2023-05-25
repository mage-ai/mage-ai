import aiofiles
import yaml

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.base import DataSource
from mage_ai.orchestration.db import safe_db_query

DATA_PROVIDERS = [
    DataSource.BIGQUERY,
    DataSource.CLICKHOUSE,
    DataSource.DRUID,
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
    DataSource.CLICKHOUSE: 'ClickHouse',
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
            try:
                profiles = list(yaml.safe_load(await file.read()).keys())
            except yaml.YAMLError as exc:
                print(exc)

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
