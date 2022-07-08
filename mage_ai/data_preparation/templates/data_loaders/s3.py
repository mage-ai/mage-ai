from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.io_config import IOConfig
from mage_ai.io.s3 import S3
from pandas import DataFrame
from os import path

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_from_s3_bucket() -> DataFrame:
    """
    Template code for loading data from S3 bucket.

    If user credentials are not specified in `~/.aws`, you must specify your
    user credentials manually in your configuration file.
    """
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    return S3.with_config(IOConfig(config_path).use(config_profile)).load()
