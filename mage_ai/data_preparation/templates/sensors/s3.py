from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.s3 import S3
from os import path

import time


if 'sensor' not in globals():
    from mage_ai.data_preparation.decorators import sensor


@sensor
def check_condition(**kwargs) -> bool:
    """
    Template code for checking if a partition exists in a S3 bucket
    """

    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    bucket_name = 'your_bucket_name'
    path = 'your_partition_path'

    return S3.with_config(ConfigFileLoader(config_path, config_profile)).exists(
        bucket_name, path
    )
