from mage_ai.io.file import FileIO
from mage_ai.io.io_config import IOConfig
from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data_from_file() -> DataFrame:
    """
    Template code for loading data from local filesytem
    """
    config_path = 'path/to/your/io/config/file.yaml'
    config_profile = 'default'

    return FileIO.with_config(IOConfig(config_path).use(config_profile)).load()
