from mage_ai.data_loader.bigquery import BigQuery
from pandas import DataFrame


def load_data_from_big_query() -> DataFrame:
    """
    Template code for loading data from Google BigQuery.

    This code template assumes that the `GOOGLE_APPLICATION_CREDENTIALS` environment
    variable is not set.
    - If this environment variable is set, then config can be left empty
    - If authentication credentials are set manually, either (a) use the
      `BigQuery.with_credentials_object()` factory method to construct the loader or (b)
      specify the mapping object with `credentials_mapping` in the config object
    - If authentication credentials are stored on file, either (a) use the
      `BigQuery.with_credentials_file()` factory method to construct the loader
      (b) specify the filepath with `path_to_credentials` in the config object
    """
    query = 'your_gbq_query'
    config = {
        'path_to_credentials': 'path/to/your/service/account/key.json',
    }

    return BigQuery(**config).load(query)
