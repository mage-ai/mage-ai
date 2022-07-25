from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.postgres import Postgres
from pandas import DataFrame
from os import path

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@data_loader
def load_data_from_postgres(**kwargs) -> DataFrame:
    """
    Template for loading data from a PostgreSQL database.
    Specify your configuration settings in 'io_config.yaml'.
    """
    query = 'your PostgreSQL query'  # Specify your SQL query here
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    with Postgres.with_config(ConfigFileLoader(config_path, config_profile)) as loader:
        return loader.load(query)

@test
def test_load_data(df: DataFrame) -> None:
    """
    Template code for testing the output of the block.
    """
    assert df is not None, 'The output is undefined'
