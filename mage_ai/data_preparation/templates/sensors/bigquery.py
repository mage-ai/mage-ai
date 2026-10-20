from mage_ai.settings.repo import get_repo_path
from mage_ai.io.bigquery import BigQuery
from mage_ai.io.config import ConfigFileLoader
from os import path

if 'sensor' not in globals():
    from mage_ai.data_preparation.decorators import sensor


@sensor
def query_bigquery_and_check_condition(*args, **kwargs) -> bool:
    """
    Template code for checking the results of a BigQuery query.
    Specify your configuration settings in 'io_config.yaml'.

    Return: True if the sensor should complete, False if it should
    keep waiting
    """

    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    query = 'Your BigQuery query'  # Specify your SQL query here

    loader = BigQuery.with_config(ConfigFileLoader(config_path, config_profile))
    df = loader.load(query)

    # Add your checks here
    if df.empty:
        return False

    return True
