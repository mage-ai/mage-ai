from mage_ai.data_loader.redshift import Redshift
from pandas import DataFrame


def load_data_from_redshift() -> DataFrame:
    config = {
        'cluster_identifier': 'your_redshift_cluster_name',
        'database': 'your_redshift_database_name',
        'db_user': 'your_redshift_database_username',
        'profile': 'default',
    }
    query = 'your_redshift_selection_query'

    with Redshift.with_iam(**config) as loader:
        return loader.load(query)
