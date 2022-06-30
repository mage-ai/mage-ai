from mage_ai.data_loader.redshift import Redshift
from pandas import DataFrame


def load_data_from_redshift() -> DataFrame:
    """
    Template code for loading data from Redshift cluster.

    This template assumes that IAM profiles are specified in `~/.aws`.
    - If IAM profiles are not setup, manually specify them as keyword arguments in `config`
    - If using temporary database credentials, use `Redshift.with_temporary_credentials()`
    to create loader.
    """
    config = {
        'cluster_identifier': 'your_redshift_cluster_name',
        'database': 'your_redshift_database_name',
        'db_user': 'your_redshift_database_username',
        'profile': 'default',
    }
    query = 'your_redshift_selection_query'

    with Redshift.with_iam(**config) as loader:
        return loader.load(query)
