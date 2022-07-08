from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.bigquery import BigQuery
from mage_ai.io.io_config import IOConfig
from pandas import DataFrame
from os import path

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_big_query(df: DataFrame) -> None:
    """
    Template code for exporting data to Google BigQuery.

    Depending on your preferred method of providing service account credentials,
    there are three options for initializing a Google BigQuery data loader:

    1. (Default) If the environment variable `GOOGLE_APPLICATION_CREDENTIALS` contains the path
    to the service account key, construct the data loader using the default constructor. Any
    additional parameters can still be specified as a keyword argument.

    2. If the path to the service account key is manually specified, construct the data loader
    using the factory method `with_credentials_file`. Example:
    ```
    BigQuery.with_credentials_file('path/to/service/account/key.json', **kwargs)
    ```

    3. If the contents of the service account key are manually specified in a dictionary-like
    object, construct the data loader using this factory method `with_credentials_object`. Example:
    ```
    BigQuery.with_credentials_object({'service_key': ...}, **kwargs)
    ```

    Alternatively, all parameters can be specified in the configuration file.
    """
    table_id = 'your-project.your_dataset.your_table_name'
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    BigQuery.with_config(IOConfig(config_path).use(config_profile)).export(
        df,
        table_id,
        if_exists='replace',  # Specify resolution policy if table name already exists
    )
