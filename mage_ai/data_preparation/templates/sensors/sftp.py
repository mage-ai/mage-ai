from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.sftp import Sftp
from os import path

if 'sensor' not in globals():
    from mage_ai.data_preparation.decorators import sensor


@sensor
def check_condition(*args, **kwargs) -> bool:
    """
    Template code for checking if a file or folder exists on an SFTP server.

    You will also need to fill out the following SFTP related fields
    in `io_config.yaml`:
        - SFTP_HOST
        - SFTP_PORT
        - SFTP_USERNAME
        - SFTP_PASSWORD or SFTP_PRIVATE_KEY
    """

    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    remote_path = 'path/to/folder/or/file'

    with Sftp.with_config(ConfigFileLoader(config_path, config_profile)) as loader:
        return loader.exists(remote_path)
