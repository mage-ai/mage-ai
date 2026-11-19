from mage_ai.data_preparation.decorators import data_loader
from mage_ai.io.postgres import Postgres


@data_loader
def load_data(*args, **kwargs):
    with Postgres.with_config(
        {
            'database': 'analytics',
            'schema': 'raw',
            'profile': 'default',
        }
    ) as loader:
        return loader.load('SELECT * FROM raw.orders')
