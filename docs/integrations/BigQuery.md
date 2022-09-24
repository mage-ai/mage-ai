# BigQuery

<img
  alt="Google BigQuery"
  src="https://www.vectorlogo.zone/logos/google_bigquery/google_bigquery-ar21.svg"
  height="200"
/>

1. Add credentials in `io_config.yaml` file.
1. Use SQL block
1. Use Python block

<br />

## Add credentials to Mage

Before you begin, you’ll need to create a service account key. Please read Google Cloud’s [documentation](https://cloud.google.com/iam/docs/creating-managing-service-account-keys)
on how to create that.

Once your finished, following these steps:

1. Create a new pipeline or open an existing pipeline.
1. Expand the left side of your screen to view the file browser.
1. Scroll down and click on a file named `io_config.yaml`.
1. Enter the following keys and values under the key named `default` (you can have multiple
profiles, add it under whichever is relevant to you)
1. Note: you only need to add the keys under `GOOGLE_SERVICE_ACC_KEY` or the value for key
`GOOGLE_SERVICE_ACC_KEY_FILEPATH` (both are not simultaneously required).
```yaml
version: 0.1.1
default:
  GOOGLE_SERVICE_ACC_KEY:
    type: service_account
    project_id: project-id
    private_key_id: key-id
    private_key: "-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END_PRIVATE_KEY"
    client_email: your_service_account_email
    auth_uri: "https://accounts.google.com/o/oauth2/auth"
    token_uri: "https://accounts.google.com/o/oauth2/token"
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/your_service_account_email"
  GOOGLE_SERVICE_ACC_KEY_FILEPATH: "/path/to/your/service/account/key.json"
```

<br />

## Using SQL block

1. Create a new pipeline or open an existing pipeline.
1. Add a data loader, transformer, or data exporter block.
1. Select `SQL`.
1. Under the `Data provider` dropdown, select `BigQuery`.
1. Under the `Profile` dropdown, select `default` (or the profile you added credentials underneath).
1. Next to the `Database` label, enter the database name you want this block to save data to.
1. Next to the `Save to schema` label, enter the schema name you want this block to save data to.
1. Under the `Write policy` dropdown, select `Replace` or `Append`
(please see [SQL blocks guide](../guides/blocks/SQL.md) for more information on write policies).
1. Enter in this test query: `SELECT 1`.
1. Run the block.

<br />

## Using Python block

1. Create a new pipeline or open an existing pipeline.
1. Add a data loader, transformer, or data exporter block.
1. Select `Generic (no template)`.
1. Enter this code snippet
(note: change the `config_profile` from `default` if you have a different profile):
```python
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.bigquery import BigQuery
from mage_ai.io.config import ConfigFileLoader
from os import path
from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data_from_big_query(**kwargs) -> DataFrame:
    """
    Template for loading data from a BigQuery warehouse.
    Specify your configuration settings in 'io_config.yaml'.

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/blocks/data_loading.md#bigquery
    """
    query = 'SELECT 1'
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    return BigQuery.with_config(ConfigFileLoader(config_path, config_profile)).load(query)
```
1. Run the block.

<br />
