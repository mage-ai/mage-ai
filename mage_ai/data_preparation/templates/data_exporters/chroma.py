from os import path

from pandas import DataFrame

from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.chroma import Chroma

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_chroma(df: DataFrame, **kwargs) -> None:
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'
    document_column = 'documents'
    new_collection = 'new_colletion'

    Chroma.with_config(ConfigFileLoader(config_path, config_profile)).export(
        df,
        collection=new_collection,
        document_column=document_column
    )
