from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.file import FileIO
from mage_ai.io.io_config import IOConfig
from pandas import DataFrame
from os import path

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_file(df: DataFrame) -> None:
    """
    Template code for exporting data to local filesytem
    """
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    FileIO.with_config(IOConfig(config_path).use(config_profile)).export(df)
