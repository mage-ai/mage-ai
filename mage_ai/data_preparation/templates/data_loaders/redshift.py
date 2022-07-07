from mage_ai.io.redshift import Redshift
from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data_from_redshift() -> DataFrame:
    """
    Template code for loading data from Redshift cluster. Additional
    configuration parameters can be added to the `config` dictionary.
    """
    query = 'your_redshift_selection_query'
    config = {
        'database': 'your_redshift_database_name',
        'user': 'database_login_username',
        'password': 'database_login_password',
        'host': 'database_host',
        'port': 'database_port',
    }

    with Redshift.with_temporary_credentials(**config) as loader:
        return loader.load(query)
