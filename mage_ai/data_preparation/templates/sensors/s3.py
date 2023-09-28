from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.s3 import S3
from os import path

if 'sensor' not in globals():
    from mage_ai.data_preparation.decorators import sensor


@sensor
def check_condition(*args, **kwargs) -> bool:
    """
    Template code for checking if a file or folder exists in a S3 bucket

    You will also need to fill out the following AWS related fields
    in `io_config.yaml`:
        - AWS_ACCESS_KEY_ID
        - AWS_SECRET_ACCESS_KEY
        - AWS_REGION
    """

    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    bucket_name = 'your_bucket_name'
    s3_path = 'path/to/folder/or/file'

    config_file_loader = ConfigFileLoader(config_path, config_profile)
    return S3.with_config(config_file_loader).exists(
        bucket_name, s3_path
    )
