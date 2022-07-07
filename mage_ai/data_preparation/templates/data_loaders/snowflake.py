from mage_ai.io.snowflake import Snowflake
from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data_from_snowflake() -> DataFrame:
    """
    Template code for loading data from a Snowflake warehouse
    """
    config = {
        'user': 'your_snowflake_username',
        'password': 'your_snowflake_password',
        'account': 'your_snowflake_account_identifier',
    }
    query = 'your_snowflake_query'

    with Snowflake(**config) as loader:
        return loader.load(query)
