from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.file import FileIO
from mage_ai.io.io_config import IOConfig
from pandas import DataFrame
from os import path

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data_from_file() -> DataFrame:
    """
    Template code for loading data from local filesytem
    """
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    return FileIO.with_config(IOConfig(config_path).use(config_profile)).load()
