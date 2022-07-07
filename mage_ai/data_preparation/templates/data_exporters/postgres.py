from mage_ai.io.postgres import Postgres
from pandas import DataFrame

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_postgres(df: DataFrame) -> None:
    """
    Template code for exporting data to a table in a PostgreSQL database
    """
    table_name = 'your_table_name'  # Specify the name of the table to export data to
    config = {
        # Specify all database connection configuration settings here
        'dbname': 'name of your database',
        'user': 'login username',
        'password': 'login password',
        'host': 'path to host address',
        'port': 'database port on host address',
    }

    with Postgres(**config) as loader:
        return loader.export(
            df,
            table_name,
            index=False,  # Specifies whether to include index in exported table
            if_exists='replace',  # Specify resolution policy if table name already exists
        )
