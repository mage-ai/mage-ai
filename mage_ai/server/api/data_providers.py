from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.base import DataSource
from mage_ai.server.api.base import BaseHandler
import yaml


DATA_PROVIDERS = [
    DataSource.BIGQUERY,
    DataSource.POSTGRES,
    DataSource.REDSHIFT,
    DataSource.SNOWFLAKE,
]


class ApiDataProvidersHandler(BaseHandler):
    def get(self):
        profiles = []

        with open(f'{get_repo_path()}/io_config.yaml', 'r') as stream:
            try:
                profiles = list(yaml.safe_load(stream).keys())
            except yaml.YAMLError as exc:
                print(exc)

        collection = [dict(
            id=ds.title(),
            profiles=[p for p in profiles if p != 'version'],
            value=ds.value,
        ) for ds in DATA_PROVIDERS]
        self.write(dict(data_providers=collection))
