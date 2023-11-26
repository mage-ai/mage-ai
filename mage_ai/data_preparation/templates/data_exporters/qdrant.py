from os import path

from pandas import DataFrame

from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.qdrant import Qdrant

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_qdrant(df: DataFrame, **kwargs) -> None:
    """
    Template for write data to Qdrant.
    """
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'
    # Update following collection name and vector size according to your requirement.
    collection_name = 'new_colletion'
    vector_size = 4

    Qdrant.with_config(ConfigFileLoader(config_path, config_profile)).export(
        df,
        collection_name=collection_name,
        vector_size=vector_size,
    )
