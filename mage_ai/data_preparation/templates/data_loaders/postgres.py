from mage_ai.data_loader.postgres import Postgres
from pandas import DataFrame


@data_loader
def load_data_from_postgres() -> DataFrame:
    """
    Template code for loading data from PostgreSQL database
    """
    query = 'your PostgreSQL query'  # Specify your SQL query here

    config = {
        # Specify all database connection configuration settings here
        'dbname': 'name of your database',
        'user': 'login username',
        'password': 'login password',
        'host': 'path to host address',
        'port': 'database port on host address',
    }

    with Postgres(**config) as loader:
        return loader.load(query)
