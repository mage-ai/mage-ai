from mage_ai.data_loader.redshift import Redshift
from pandas import DataFrame


@data_loader
def load_data_from_redshift() -> DataFrame:
    """
    Template code for loading data from Redshift cluster. Additional
    configuration parameters can be added to the `config` dictionary.
    """
    config = {
        'database': 'your_redshift_database_name',
        'user': 'database_login_username',
        'password': 'database_login_password',
        'host': 'database_host',
        'port': 'database_port',
    }
    query = 'your_redshift_selection_query'

    with Redshift.with_temporary_credentials(**config) as loader:
        return loader.load(query)
