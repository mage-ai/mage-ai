from os import path

from pandas import DataFrame

from mage_ai.settings.repo import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.algolia import Algolia

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_algolia(df: DataFrame, **kwargs) -> None:
    """
    Template to export data into Algolia.
    """
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'
    # Specify the name of the index to export data to.
    index_name = 'test'

    Algolia.with_config(ConfigFileLoader(config_path, config_profile)).export(
        df,
        index_name=index_name
    )
