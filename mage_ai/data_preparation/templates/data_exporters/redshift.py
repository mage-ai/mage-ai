from mage_ai.io.redshift import Redshift
from pandas import DataFrame


@data_exporter
def export_data_to_redshift(df: DataFrame) -> None:
    """
    Template code for exporting data to a table in a Redshift cluster. Additional
    configuration parameters can be added to the `config` dictionary.
    """
    table_name = 'your_table_name'
    config = {
        'database': 'your_redshift_database_name',
        'user': 'database_login_username',
        'password': 'database_login_password',
        'host': 'database_host',
        'port': 'database_port',
    }

    with Redshift.with_temporary_credentials(**config) as loader:
        return loader.export(df, table_name)
