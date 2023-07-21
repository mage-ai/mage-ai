from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.base import FileFormat
from mage_ai.io.systemlink import FileIngestionService
from pandas import DataFrame
from os import path

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_systemlink_fis(df: DataFrame, **kwargs) -> None:
    """
    Template for exporting data to File Ingestion Service
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://docs.mage.ai/design/data-exporting#systemlink
    """
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'
    filename = 'your_filename'
    workspace = 'your_workspace'

    return FileIngestionService.with_config(ConfigFileLoader(config_path, config_profile)).export(
        df,
        filename,
        workspace,
        FileFormat.CSV
    )