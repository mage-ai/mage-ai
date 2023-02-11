from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.base import DataSource
from mage_ai.server.api.base import BaseHandler
import aiofiles
import yaml


DATA_PROVIDERS = [
    DataSource.BIGQUERY,
    DataSource.MYSQL,
    DataSource.POSTGRES,
    DataSource.REDSHIFT,
    DataSource.SNOWFLAKE,
]


class ApiDataProvidersHandler(BaseHandler):
    async def get(self):
        profiles = []

        async with aiofiles.open(f'{get_repo_path()}/io_config.yaml', mode='r') as file:
            try:
                profiles = list(yaml.safe_load(await file.read()).keys())
            except yaml.YAMLError as exc:
                print(exc)

        collection = [dict(
            id=ds.title(),
            profiles=[p for p in profiles if p != 'version'],
            value=ds.value,
        ) for ds in DATA_PROVIDERS]
        self.write(dict(data_providers=collection))
