from pandas import DataFrame
import io
import pandas as pd
import requests

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data_from_api() -> DataFrame:
    """
    Template for loading data from API
    """
    url = ''

    response = requests.get(url)
    return pd.read_csv(io.StringIO(response.text), sep=',')
