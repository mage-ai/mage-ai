# Table of Contents
- [Table of Contents](#table-of-contents)
- [Data Loading Overview](#data-loading-overview)
  - [Example: Loading data from a file](#example-loading-data-from-a-file)
  - [Example: Loading data from Snowflake warehouse](#example-loading-data-from-snowflake-warehouse)
- [Client APIs](#client-apis)
  - [Redshift](#redshift)
  - [S3](#s3)
  - [FileIO](#fileio)
  - [BigQuery](#bigquery)
  - [PostgreSQL](#postgresql)
  - [Snowflake](#snowflake)
- [Configuration Settings](#configuration-settings)
  - [Configuration Loader APIs](#configuration-loader-apis)
    - [Configuration File](#configuration-file)
    - [Environment Variables](#environment-variables)
    - [AWS Secret Loader](#aws-secret-loader)

# Data Loading Overview

Mage provides data loading clients that simplify loading and exporting data in your pipelines, allowing you to spend more time analyzing and transforming your data for ML tasks. Currently, Mage contains clients for the following data sources:

-   AWS Redshift
-   AWS S3
-   File Loading
-   Google BigQuery
-   PostgreSQL Database
-   Snowflake

## Example: Loading data from a file

While traditional Pandas IO procedures can be utilized to load files into your pipeline, Mage provides the `mage_ai.io.file.FileIO` client as a convenience wrapper.

The following code uses the `load` function of the `FileIO` client to load the Titanic survival dataset from a CSV file into a Pandas DataFrame for use in your pipeline. All data loaders can be initialized with the `verbose = True` parameter to enable verbose output printing the current action the data loading client is performing. This parameter defaults to `False`.

```python
loader = FileIO(verbose=True)
df = loader.load(
    'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv'
)
```

Then the `export` function is used to save this data frame back to file, this time in JSON format

```python
loader.export(df, './titanic_survival.json', orient='records')
```

Any formatting settings (such as specifying the JSON orient) can be passed as keyword arguments to `load` and `export`. These arguments are passed to Pandas IO procedures for the requested file format, allowing you finer-grained control over how your data is loaded and exported.

As the data loader was constructed with the verbose parameter set to `True`, the above operations would print the following output describing the actions of the data loader.

```bash
FileIO initialized
├─ Loading data frame from 'https://raw.githubusercontent.com/datasciencedojodatasets/master/titanic.csv'...DONE
└─ Exporting data frame to './titanic_survival.json'...DONE
```

To read more about loading from files, see the [FileIO](#fileio) API for more details on member functions and usage.

## Example: Loading data from Snowflake warehouse

Loading data from a Snowflake data warehouse is made easy using the `mage_ai.io.snowflake.Snowflake` data loading client. In order to authenticate and access your Snowflake data, the client will require access to your Snowflake credentials:

-   Account Username
-   Account Password
-   Account ID (including your region) (Ex: _example.us-west-2_)

These parameters can be manually specified as input to the data loading client (see [Snowflake](#snowflake) API). However we recommend using a [Configuration Loader](#configuration-settings) to handle loading these secrets. If you used `mage init` to create your project repository, you can store these values in your `io_config.yaml` file and use

`mage_ai.io.config.ConfigFileLoader` to construct the data loader client.

An example `io_config.yaml` file in this instance would be:

```yaml
default:
    SNOWFLAKE_USER: my_username
    SNOWFLAKE_PASSWORD: my_password
    SNOWFLAKE_ACCOUNT_ID: example.us-west-2
```

with which a Snowflake data loading client can be constructed as:

```python
config = ConfigFileLoader('io_config.py', 'default')
loader = Snowflake.with_config(config, verbose=True)
```

To learn more about using configuration settings, see [Configuration Settings](#configuration-settings).

Then the following code uses the functions:

-   `execute` to execute an arbitrary query on your data warehouse. In this case, the warehouse, database, and schema to use are selected.
-   `load` to load the results of a SELECT query into a Pandas DataFrame.
-   `export` to export the data frame to a table in your data warehouse. If the table exists, then the data is appended by default (and can be configured with other behavior, see [Snowflake](#snowflake) API). If the table doesn't exist, then the table is created with the given schema name and table name.

```python
with loader:
    loader.execute('USE WAREHOUSE my_warehouse;')
    loader.execute('USE DATABASE my_database;')
    loader.execute('USE SCHEMA my_schema;')
    df = loader.load('SELECT * FROM test_table;')
    loader.export(df, 'my_schema', 'test_table')
```

The `loader` object manages a direct connection to your Snowflake data warehouse, so it is important to make sure that your connection is closed once your operations are completed. You can manually use `loader.open()` and `loader.close()` to open and close the connection to your data warehouse or automatically manage the connection with a context manager.

To learn more about loading data from Snowflake, see the [Snowflake](#snowflake) API for more details on member functions and usage.

# Client APIs

This section covers the API for using the following data loaders.

## Redshift

## S3

## FileIO

## BigQuery

## PostgreSQL

## Snowflake

# Configuration Settings

Connections to third-party data storage require you to specify confidential information such as login information or access keys. While you can manually specify this information code while constructing data loading clients, it is recommended to not store the secrets directly in code.

To help with this, Mage provides **configuration loaders** which allow data loading clients to use your secrets without explicitly writing them in code.

Currently, the following sources (and their corresponding configuration loader) can be used to load configuration settings:

-   Configuration File - `ConfigFileLoader`
-   Environment Variables - `EnvironmentVariableLoader`
-   AWS Secrets Manager - `AWSSecretLoader`

For example, the code below constructs a Redshift data loading client using secrets stored in AWS Secrets Manager

```python
from mage_ai.io.config import AWSSecretLoader
from mage_ai.io.redshift import Redshift

config = AWSSecretLoader()
loader = Redshift.from_config(config)
```

The following are the set of allowed key names that you must name your secrets with in order Mage's configuration loaders to recognize your secrets. In code you can refer to these keys by their string name or using the `mage_ai.io.config.ConfigKey` enumeration. Not all keys need be specified at once - only use the keys related to the services you utilize.

| Key Name                        | Service         | Client Parameter    | Description                                                             | Notes                                 |
| ------------------------------- | --------------- | ------------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| AWS_ACCESS_KEY_ID               | AWS General     | access_key_id       | AWS Access Key ID credential                                            | Used by Redshift and S3               |
| AWS_SECRET_ACCESS_KEY           | AWS General     | secret_access_key   | AWS Secret Access Key credential                                        | Used by Redshift and S3               |
| AWS_SESSION_TOKEN               | AWS General     | session_token       | AWS Session Token (used to generate temporary DB credentials)           | Used by Redshift                      |
| AWS_REGION                      | AWS General     | region              | AWS Region                                                              | Used by Redshift and S3               |
| REDSHIFT_DBNAME                 | AWS Redshift    | database            | Name of Redshift database to connect to                                 |                                       |
| REDSHIFT_HOST                   | AWS Redshift    | host                | Redshift Cluster hostname                                               | Use with temporary credentials        |
| REDSHIFT_PORT                   | AWS Redshift    | port                | Redshift Cluster port. Optional, defaults to 5439.                      | Use with temporary credentials        |
| REDSHIFT_TEMP_CRED_USER         | AWS Redshift    | user                | Redshift temporary credentials username.                                | Use with temporary credentials        |
| REDSHIFT_TEMP_CRED_PASSWORD     | AWS Redshift    | password            | Redshift temporary credentials password.                                | Use with temporary credentials        |
| REDSHIFT_DBUSER                 | AWS Redshift    | db_user             | Redshift database user to generate credentials for.                     | Use to generate temporary credentials |
| REDSHIFT_CLUSTER_ID             | AWS Redshift    | cluster_identifier  | Redshift cluster ID                                                     | Use to generate temporary credentials |
| REDSHIFT_IAM_PROFILE            | AWS Redshift    | profile             | Name of the IAM profile to generate temporary credentials with          | Use to generate temporary credentials |
| POSTGRES_DBNAME                 | PostgreSQL      | dbname              | Database name                                                           |                                       |
| POSTGRES_USER                   | PostgreSQL      | user                | Database login username                                                 |                                       |
| POSTGRES_PASSWORD               | PostgreSQL      | password            | Database login password                                                 |                                       |
| POSTGRES_HOST                   | PostgreSQL      | host                | Database hostname                                                       |                                       |
| POSTGRES_PORT                   | PostgreSQL      | port                | PostgreSQL database port                                                |                                       |
| SNOWFLAKE_USER                  | Snowflake       | user                | Snowflake username                                                      |                                       |
| SNOWFLAKE_PASS                  | Snowflake       | password            | Snowflake password                                                      |                                       |
| SNOWFLAKE_ACCOUNT               | Snowflake       | account             | Snowflake account ID (including region)                                 |                                       |
| SNOWFLAKE_DEFAULT_DB            | Snowflake       | database            | Default database to use. Optional, no database chosen if unspecified.   |                                       |
| SNOWFLAKE_DEFAULT_SCHEMA        | Snowflake       | schema              | Default schema to use. Optional, no schema chosen if unspecified.       |                                       |
| SNOWFLAKE_DEFAULT_WH            | Snowflake       | warehouse           | Default warehouse to use. Optional, no warehouse chosen if unspecified. |                                       |
| GOOGLE_SERVICE_ACC_KEY          | Google BigQuery | credentials_mapping | Service account key                                                     |                                       |
| GOOGLE_SERVICE_ACC_KEY_FILEPATH | Google BigQuery | path_to_credentials | Path to service account key                                             |                                       |

## Configuration Loader APIs

This section contains the exact APIs and more detailed information on the configuration loaders. Every configuration loader has two functions:

-   `contains` - checks if the configuration source contains the requested key. Commonly, the `in` operation is used to check for setting existence (but is not always identical as `contains` can accept multiple parameters while the `in` keyword only accepts the key).

    ```python
    if config.contains(ConfigKey.POSTGRES_PORT):
        ...
    # alternatively
    if ConfigKey.POSTGRES_PORT in config:
        ...
    ```

-   `get` - gets the configuration setting associated with the given key. If the key doesn't exist, returns None. Commonly, the data model overload `__getitem__` is used to fetch a configuration setting (but is not always identical as `get` can accept multiple parameters while `__getitem__` does not).

    ```python
    user = config.get(ConfigKey.REDSHIFT_DBUSER)
    # alternatively
    user = config[ConfigKey.REDSHIFT_DBUSER]
    ```

These functions are shared among all configuration loaders, but depending on the source some function signatures may differ.

### Configuration File

**Example**: 
```python
from mage_ai.io.config import ConfigKey, ConfigFileLoader

config = ConfigFileLoader('path/to/my/config.yaml', 'my_profile')
postgres_db = config[ConfigKey.POSTGRES_DBNAME]
```

**Constructor**: `__init__(filepath: os.PathLike, profile: str)`
Initializes IO Configuration loader. Input configuration file can have two formats:
- _Standard_: contains a subset of the configuration keys specified in `ConfigKey`. This
    is the default and recommended format. Below is an example configuration file using this format.
    ```yaml
    version: 0.1.0
    default:
        AWS_ACCESS_KEY_ID: AWS Access Key ID credential
        AWS_SECRET_ACCESS_KEY: AWS Secret Access Key credential
        AWS_REGION: AWS Region
        REDSHIFT_DBNAME: Name of Redshift database to connect to
        REDSHIFT_HOST: Redshift Cluster hostname
        REDSHIFT_PORT: Redshift Cluster port. Optional, defaults to 5439
        REDSHIFT_TEMP_CRED_USER: Redshift temp credentials username
        REDSHIFT_TEMP_CRED_PASSWORD: Redshift temp credentials password
    ```
- _Verbose_: Instead of configuration keys, each profile stores an object of settings associated with
    each data migration client. This format was used in previous versions of this tool, and exists
    for backwards compatibility. Below is an example configuration file using this format.
    ```yaml
    version: 0.1.0
    default:
        AWS:
            Redshift:
                database: Name of Redshift database to connect to
                host: Redshift Cluster hostname
                port: Redshift Cluster port. Optional, defaults to 5439
                user: Redshift temp credentials username
                password: Redshift temp credentials password
            access_key_id: AWS Access Key ID credential
            secret_access_key: AWS Secret Access Key credential
            region: AWS Region
    ```

**Args**:
  - `filepath (os.PathLike, optional)`: Path to IO configuration file. Defaults to '[repo_path]/io_config.yaml'
  - `profile (str, optional)`: Profile to load configuration settings from. Defaults to 'default'.

**Methods**

**_contains_**: `contains(self, key: ConfigKey | str) -> Any`

Checks if the configuration setting stored under `key` is contained.

**Args**:
- `key (str)`: Name of the configuration setting to check.

**Returns** (`bool`) Returns true if configuration setting exists, otherwise returns false.

<hr>

**_get_** `get(self, key: ConfigKey | str) -> Any`

Loads the configuration setting stored under `key`.

**Args**:
- `key (str)`: Key name of the configuration setting to load

**Returns**: (`Any`) Configuration setting corresponding to the given key

### Environment Variables

Loads secrets from environment variables in your current environment.

**Example**:
```python
from mage_ai.io.config import ConfigKey, EnvironmentVariableLoader

config = EnvironmentVariableLoader()
postgres_db = config[ConfigKey.POSTGRES_DBNAME]
```

**Constructor** : `__init__(self)` - no parameters for construction.

**Methods**:

**_contains_**: `contains(env_var: ConfigKey | str) -> bool`

Checks if the environment variable given by `env_var` exists.

-   **Args**:

    -   `key (ConfigKey | str)`: Name of the configuration setting to check existence of.

-   **Returns**: (`bool`) Returns true if configuration setting exists, otherwise returns false.

<hr>

**_get_**: `get(env_var: ConfigKey | str) -> Any`

Loads the config setting stored under the environment variable `env_var`.

-   **Args**:

    -   `env_var (str)`: Name of the environment variable to load configuration setting from

-   **Returns**: (`Any`) The configuration setting stored under `env_var`


### AWS Secret Loader

Loads secrets from AWS Secrets Manager. To authenticate with AWS Secrets Manager, either 
- Configure your AWS profile using the AWS CLI
    ```bash
    aws configure
    ```
- Manually specify your AWS Credentials when constructing the configuration loader
    ```python
    config = AWSSecretLoader(
        aws_access_key_id = 'your access key id',
        aws_secret_access_key = 'your secret key',
        aws_region = 'your region'
    )
    ```
**Example**:
```python
from mage_ai.io.config import ConfigKey, AWSSecretLoader

config = AWSSecretLoader()
postgres_db = config[ConfigKey.POSTGRES_DBNAME]
# with finer control on version
postgres_db = config.get(ConfigKey.POSTGRES_DBNAME, version_id='my_version_id')
```

**Constructor** : `__init__(self, **kwargs)`:
- **Keyword Arguments**:
  - `aws_access_key_id (str, Optional)`: AWS access key ID credential
  - `aws_secret_access_key (str, Optional)`: AWS secret access key credential
  - `aws_region (str, Optional)`: AWS region which Secrets Manager is created in

**Methods**:

**_contains_**: `contains( secret_id: ConfigKey | str, version_id: str, version_stage_label : str) -> bool`
Check if there is a secret with ID `secret_id` contained. Can also specify the version of the
secret to check. If
- both `version_id` and `version_stage_label` are specified, both must agree on the secret version
- neither of `version_id` or `version_stage_label` are specified, any version is checked
- one of `version_id` and `version_stage_label` are specified, the associated version is checked

**Args**:
  - `secret_id (str)`: ID of the secret to load
  - `version_id (str, Optional)`: ID of the version of the secret to load. Defaults to None.
  - `version_stage_label (str, Optional)`: Staging label of the version of the secret to load. Defaults to None.

**Returns**:(`bool`) Returns true if secret exists, otherwise returns false.

<hr>

**_get_**: `get(secret_id: ConfigKey | str, version_id: str, version_stage_label : str) -> bytes | str`
Loads the secret stored under `secret_id`. Can also specify the version of the
secret to fetch. If
- both `version_id` and `version_stage_label` are specified, both must agree on the secret version
- neither of `version_id` or `version_stage_label` are specified, the current version is loaded
- one of `version_id` and `version_stage_label` are specified, the associated version is loaded

**Args**:
   - `secret_id (str)`: ID of the secret to load
   - ` version_id (str, Optional)`: ID of the version of the secret to load. Defaults to None.
   - `version_stage_label (str, Optional)`: Staging label of the version of the secret to load. Defaults to None.

**Returns**: (`bytes | str`) The secret stored under `secret_id` in AWS secret manager. If secret is a binary value, returns a `bytes` object; else returns a `string` object
