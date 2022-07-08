from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.io_config import IOConfig
from mage_ai.io.redshift import Redshift
from pandas import DataFrame
from os import path

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_redshift(df: DataFrame) -> None:
    """
    Template code for exporting data to a table in a Redshift cluster.  Additional
    configuration parameters can be defined in your configuration file.
    """
    table_name = 'your_table_name'
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    with Redshift.with_config(IOConfig(config_path).use(config_profile)) as loader:
        loader.export(df, table_name)
