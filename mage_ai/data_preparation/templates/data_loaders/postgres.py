from mage_ai.data_loader.postgres import Postgres


def load_data_from_databricks():
    """
    Template code for loading data from PostgreSQL database
    """
    query = 'your PostgreSQL query'  # Specify your SQL query here

    config = {
        # Specify all Databricks connection configuration settings here
        'dbname': 'name of your database',
        'user': 'login username',
        'password': 'login password',
    }

    with Postgres(**config) as loader:
        return loader.load(query)
