from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.redshift import Redshift
from os import path

if 'sensor' not in globals():
    from mage_ai.data_preparation.decorators import sensor


@sensor
def query_redshift_and_check_condition(**kwargs) -> bool:
    """
    Template code for checking the results of a Redshift query.
    Specify your configuration settings in 'io_config.yaml'.

    Return: True if the sensor should complete, False if it should
    keep waiting
    """

    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    query = 'Your Redshift query'  # Specify your SQL query here

    with Redshift.with_config(
            ConfigFileLoader(config_path, config_profile)) as loader:
        df = loader.load(query)

        # Add your checks here
        if df.empty:
            return False

    return True
