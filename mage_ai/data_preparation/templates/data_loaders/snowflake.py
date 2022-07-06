from mage_ai.io.io_config import IOConfig
from mage_ai.io.snowflake import Snowflake
from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data_from_snowflake() -> DataFrame:
    """
    Template code for loading data from a Snowflake warehouse
    """
    query = 'your_snowflake_query'
    config_path = 'path/to/your/io/config/file.yaml'
    config_profile = 'default'

    with Snowflake.with_config(IOConfig(config_path).use(config_profile)) as loader:
        return loader.load(query)
