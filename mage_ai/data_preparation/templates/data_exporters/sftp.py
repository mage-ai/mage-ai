from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.sftp import Sftp
from pandas import DataFrame
from os import path

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_sftp(df: DataFrame, **kwargs) -> None:
    """
    Template for exporting data to a file on an SFTP server.
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://docs.mage.ai/design/data-loading#sftp
    """
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    remote_path = 'path/to/your/file.csv'

    with Sftp.with_config(ConfigFileLoader(config_path, config_profile)) as exporter:
        exporter.export(df, remote_path)
