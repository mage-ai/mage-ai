from mage_ai.data_loader.bigquery import BigQuery
from pandas import DataFrame


def load_data_from_big_query() -> DataFrame:
    """
    Template code for loading data from Google BigQuery.

    This code template assumes that the `GOOGLE_APPLICATION_CREDENTIALS` environment
    variable is not set.
    - If this environment variable set, then config can be left empty.
    - If authentication credentials are to be set automatically, use the
      `BigQuery.with_credentials_obj()` factory method to construct the loader.
      This method takes as input a mapping containing all credentials necessary, similar
      to a service account key.
    """
    query = 'your_gbq_query'
    config = {
        'path_to_credentials': 'path/to/your/service/account/key.json',
    }

    return BigQuery.with_credentials_file(**config).load(query)
