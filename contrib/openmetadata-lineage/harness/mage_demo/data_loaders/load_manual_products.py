if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader

from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.postgres import Postgres
from mage_ai.settings.repo import get_repo_path
from os import path


@data_loader
def load_data(*args, **kwargs):
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    with Postgres.with_config(ConfigFileLoader(config_path, 'default')) as loader:
        return loader.load('SELECT id, name, category, price FROM raw.manual_products')
