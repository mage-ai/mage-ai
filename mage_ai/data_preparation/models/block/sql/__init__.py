from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.base import DataSource
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.postgres import Postgres
from os import path


def execute_sql_code(block, query):
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = block.configuration.get('data_provider_profile')

    if DataSource.POSTGRES.value == block.configuration.get('data_provider'):
        with Postgres.with_config(ConfigFileLoader(config_path, config_profile)) as loader:
            return loader.load(query)
