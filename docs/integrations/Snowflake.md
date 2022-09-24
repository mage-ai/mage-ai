# Snowflake

<img
  alt="Snowflake"
  src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Snowflake_Logo.svg/1280px-Snowflake_Logo.svg.png"
  height="100"
/>

<br />

## Add credentials in `io_config.yaml`

1. Create a new pipeline or open an existing pipeline.
1. Expand the left side of your screen to view the file browser.
1. Scroll down and click on a file named `io_config.yaml`.
1. Enter the following keys and values under the key named `default` (you can have multiple
profiles, add it under whichever is relevant to you)
```yaml
version: 0.1.1
default:
  SNOWFLAKE_USER: ...
  SNOWFLAKE_PASSWORD: ...
  SNOWFLAKE_ACCOUNT: ...
  SNOWFLAKE_DEFAULT_WH: ...
```

<br />

## Using SQL block

1. Create a new pipeline or open an existing pipeline.
1. Add a data loader, transformer, or data exporter block.
1. Select `SQL`.
1. Under the `Data provider` dropdown, select `Snowflake`.
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
1. Add a data loader, transformer, or data exporter block
(the code snippet below is for a data loader).
1. Select `Generic (no template)`.
1. Enter this code snippet
(note: change the `config_profile` from `default` if you have a different profile):
```python
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.snowflake import Snowflake
from os import path
from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data_from_snowflake(**kwargs) -> DataFrame:
    query = 'SELECT 1'
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    config_profile = 'default'

    with Snowflake.with_config(ConfigFileLoader(config_path, config_profile)) as loader:
        return loader.load(query)
```
1. Run the block.

<br />
