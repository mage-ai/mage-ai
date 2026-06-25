from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.sftp import SFTP
from os import path

if 'sensor' not in globals():
    from mage_ai.data_preparation.decorators import sensor


@sensor
def check_condition(*args, **kwargs) -> bool:
    """
    Template code for checking if a file or folder exists on an SFTP server.

    You will also need to fill out the following SFTP related fields
    in ``io_config.yaml``:
        - SFTP_HOST
        - SFTP_USERNAME
        - SFTP_PASSWORD  (or SFTP_PKEY)
    """

    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    remote_path = '/path/to/remote/file_or_folder'

    config_file_loader = ConfigFileLoader(config_path, config_profile)
    return SFTP.with_config(config_file_loader).exists(
        remote_path,
    )
